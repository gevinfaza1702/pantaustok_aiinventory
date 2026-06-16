"""
Inventory Calendar service.
Aggregates dated events from across the system into a single feed:
  - stock movements (blue)
  - PO expected arrivals (green)
  - cycle counts / stock opname (purple)
"""

from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.db_models import StockMovement
from models.extended_models import PurchaseOrder
from models.stockopname_models import CycleCount


async def get_calendar_events(
    session: AsyncSession, start: datetime, end: datetime
) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []

    # ── Stock movements ──
    mv_result = await session.execute(
        select(StockMovement)
        .where(StockMovement.created_at >= start, StockMovement.created_at <= end)
        .options(selectinload(StockMovement.product))
        .order_by(StockMovement.created_at)
    )
    for m in mv_result.scalars().all():
        events.append({
            "id": f"mv-{m.id}",
            "type": "movement",
            "date": m.created_at.date().isoformat(),
            "title": f"{m.movement_type.upper()} {m.quantity} · {m.product.name if m.product else ''}",
            "detail": m.reference or m.notes or "",
        })

    # ── PO expected arrivals ──
    po_result = await session.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.expected_arrival.isnot(None))
        .where(PurchaseOrder.expected_arrival >= start, PurchaseOrder.expected_arrival <= end)
        .options(selectinload(PurchaseOrder.product), selectinload(PurchaseOrder.supplier))
    )
    for po in po_result.scalars().all():
        events.append({
            "id": f"po-{po.id}",
            "type": "po_arrival",
            "date": po.expected_arrival.date().isoformat(),
            "title": f"PO tiba · {po.product.name if po.product else ''}",
            "detail": f"{po.order_qty} unit dari {po.supplier.name if po.supplier else 'N/A'}",
        })

    # ── Cycle counts ──
    cc_result = await session.execute(
        select(CycleCount).where(
            CycleCount.created_at >= start, CycleCount.created_at <= end
        )
    )
    for cc in cc_result.scalars().all():
        when = cc.completed_at or cc.started_at or cc.created_at
        events.append({
            "id": f"cc-{cc.id}",
            "type": "cycle_count",
            "date": when.date().isoformat(),
            "title": f"Stok Opname · {cc.name}",
            "detail": f"Status: {cc.status}",
        })

    return events
