"""
Scheduled Reports service.
- PDF generation (inventory / P&L) via reportlab
- Schedule CRUD
- SMTP email sending (no-op if SMTP not configured)
"""

import io
import json
import smtplib
from email.message import EmailMessage
from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any

from fastapi import HTTPException
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.db_models import Product
from models.report_models import ScheduledReport
from services import pnl_service


# ─── PDF builders ────────────────────────────────────────
def _doc(buf):
    return SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)


def _header(styles, title: str) -> list:
    return [
        Paragraph("PantauStok AI", styles["Title"]),
        Paragraph(title, styles["Heading2"]),
        Paragraph(f"Dibuat: {datetime.utcnow().strftime('%d %b %Y %H:%M')} UTC", styles["Normal"]),
        Spacer(1, 10 * mm),
    ]


def _styled_table(data: list) -> Table:
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f6fb")]),
    ]))
    return table


async def generate_inventory_report(session: AsyncSession) -> bytes:
    result = await session.execute(select(Product).order_by(Product.name))
    products = result.scalars().all()

    buf = io.BytesIO()
    styles = getSampleStyleSheet()
    elements = _header(styles, "Laporan Inventaris")

    rows = [["SKU", "Nama", "Kategori", "Stok", "Min", "Nilai (Rp)"]]
    total_value = 0.0
    for p in products:
        value = (p.current_stock or 0) * float(p.cost_price or 0)
        total_value += value
        rows.append([
            p.sku, p.name[:30], p.category,
            str(p.current_stock), str(p.min_stock), f"{value:,.0f}",
        ])
    rows.append(["", "", "", "", "TOTAL", f"{total_value:,.0f}"])
    elements.append(_styled_table(rows))

    _doc(buf).build(elements)
    buf.seek(0)
    return buf.read()


async def generate_pnl_report(session: AsyncSession) -> bytes:
    overview = await pnl_service.get_profit_overview(session)
    by_cat = await pnl_service.get_profit_by_category(session)

    buf = io.BytesIO()
    styles = getSampleStyleSheet()
    elements = _header(styles, "Laporan Laba Rugi")

    elements.append(_styled_table([
        ["Metrik", "Nilai"],
        ["Pendapatan", f"Rp {overview['total_revenue']:,.0f}"],
        ["HPP", f"Rp {overview['total_cogs']:,.0f}"],
        ["Laba Kotor", f"Rp {overview['gross_profit']:,.0f}"],
        ["Margin", f"{overview['gross_margin_pct']}%"],
    ]))
    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph("Laba per Kategori", styles["Heading3"]))

    cat_rows = [["Kategori", "Pendapatan", "HPP", "Laba", "Margin"]]
    for c in by_cat:
        cat_rows.append([
            c["category"], f"{c['revenue']:,.0f}", f"{c['cogs']:,.0f}",
            f"{c['profit']:,.0f}", f"{c['margin_pct']}%",
        ])
    elements.append(_styled_table(cat_rows))

    _doc(buf).build(elements)
    buf.seek(0)
    return buf.read()


async def generate_report(session: AsyncSession, report_type: str) -> bytes:
    if report_type == "inventory":
        return await generate_inventory_report(session)
    if report_type == "pnl":
        return await generate_pnl_report(session)
    raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")


# ─── Email (no-op when SMTP not configured) ──────────────
def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER)


def send_report_email(recipients: List[str], subject: str, pdf: bytes, filename: str) -> bool:
    if not smtp_configured() or not recipients:
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = ", ".join(recipients)
    msg.set_content("Laporan terlampir dari PantauStok AI.")
    msg.add_attachment(pdf, maintype="application", subtype="pdf", filename=filename)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True


# ─── Schedule CRUD ───────────────────────────────────────
def _serialize(r: ScheduledReport) -> Dict[str, Any]:
    try:
        recipients = json.loads(r.recipients_json)
    except (ValueError, TypeError):
        recipients = []
    return {
        "id": str(r.id),
        "name": r.name,
        "report_type": r.report_type,
        "frequency": r.frequency,
        "schedule_cron": r.schedule_cron,
        "recipients": recipients,
        "is_active": r.is_active,
        "last_sent": r.last_sent.isoformat() if r.last_sent else None,
    }


async def list_schedules(session: AsyncSession) -> List[Dict[str, Any]]:
    result = await session.execute(select(ScheduledReport).order_by(ScheduledReport.created_at))
    return [_serialize(r) for r in result.scalars().all()]


async def create_schedule(session: AsyncSession, name: str, report_type: str,
                          frequency: str, recipients: List[str]) -> Dict[str, Any]:
    cron = {"daily": "0 8 * * *", "weekly": "0 8 * * 1", "monthly": "0 8 1 * *"}.get(frequency, "0 8 * * 1")
    sched = ScheduledReport(
        name=name, report_type=report_type, frequency=frequency,
        schedule_cron=cron, recipients_json=json.dumps(recipients),
    )
    session.add(sched)
    await session.commit()
    await session.refresh(sched)
    return _serialize(sched)


async def delete_schedule(session: AsyncSession, schedule_id: UUID) -> None:
    sched = await session.get(ScheduledReport, schedule_id)
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    await session.delete(sched)
    await session.commit()
