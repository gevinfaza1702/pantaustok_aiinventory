"""
Export Service
Generates Excel (.xlsx) and CSV reports for inventory data.
"""

import io
import csv
from datetime import datetime
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.db_models import Product, StockMovement, Supplier


async def export_inventory_csv(session: AsyncSession) -> bytes:
    """Export full inventory valuation as CSV bytes."""
    result = await session.execute(
        select(Product).where(Product.status == "active").order_by(Product.category, Product.name)
    )
    products = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "SKU", "Name", "Category", "Unit",
        "Current Stock", "Min Stock", "Max Stock",
        "Cost Price (IDR)", "Sell Price (IDR)", "Inventory Value (IDR)",
        "Status", "Lead Time (days)"
    ])

    for p in products:
        value = p.current_stock * float(p.cost_price)
        writer.writerow([
            p.sku, p.name, p.category, p.unit,
            p.current_stock, p.min_stock, p.max_stock or "",
            float(p.cost_price), float(p.sell_price), round(value, 2),
            p.status, p.lead_time_days,
        ])

    return output.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility


async def export_movements_csv(session: AsyncSession, days: int = 30) -> bytes:
    """Export stock movement log as CSV bytes."""
    from datetime import timedelta
    from sqlalchemy.orm import joinedload

    cutoff = datetime.utcnow() - timedelta(days=days)

    result = await session.execute(
        select(StockMovement)
        .options(joinedload(StockMovement.product))
        .where(StockMovement.created_at >= cutoff)
        .order_by(StockMovement.created_at.desc())
    )
    movements = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Product Name", "SKU", "Movement Type",
        "Quantity", "Reference", "Created By", "Notes"
    ])

    for m in movements:
        writer.writerow([
            m.created_at.strftime("%Y-%m-%d %H:%M"),
            m.product.name if m.product else "",
            m.product.sku if m.product else "",
            m.movement_type,
            m.quantity,
            m.reference or "",
            m.created_by or "",
            m.notes or "",
        ])

    return output.getvalue().encode("utf-8-sig")


async def export_suppliers_csv(session: AsyncSession) -> bytes:
    """Export supplier list as CSV bytes."""
    result = await session.execute(select(Supplier).order_by(Supplier.name))
    suppliers = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Supplier Name", "Contact Person", "Email", "Phone",
        "Reliability Score", "Status", "Created At"
    ])

    for s in suppliers:
        writer.writerow([
            s.name, s.contact_person or "", s.email or "", s.phone or "",
            f"{float(s.reliability_score) * 100:.1f}%",
            s.status,
            s.created_at.strftime("%Y-%m-%d"),
        ])

    return output.getvalue().encode("utf-8-sig")
