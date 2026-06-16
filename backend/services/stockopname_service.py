"""
Stock Opname / Cycle Count service.
Create count sessions, record counted quantities, surface discrepancies,
and approve adjustments (which create 'adjustment' stock movements).
"""

from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.db_models import Product, StockMovement
from models.stockopname_models import CycleCount, CycleCountItem


async def create_cycle_count(
    session: AsyncSession,
    name: str,
    product_ids: Optional[List[UUID]] = None,
    warehouse_id: Optional[UUID] = None,
    created_by: str = "system",
) -> CycleCount:
    """Create a session. If no product_ids given, include all active products."""
    cc = CycleCount(
        name=name, warehouse_id=warehouse_id, created_by=created_by,
        status="in_progress", started_at=datetime.utcnow(),
    )
    session.add(cc)
    await session.flush()

    if product_ids:
        result = await session.execute(select(Product).where(Product.id.in_(product_ids)))
        products = result.scalars().all()
    else:
        result = await session.execute(select(Product).where(Product.status == "active"))
        products = result.scalars().all()

    for p in products:
        session.add(CycleCountItem(
            cycle_count_id=cc.id, product_id=p.id,
            system_qty=p.current_stock or 0, counted_qty=None, discrepancy=0,
        ))

    await session.commit()
    await session.refresh(cc)
    return cc


async def list_cycle_counts(session: AsyncSession) -> List[CycleCount]:
    result = await session.execute(select(CycleCount).order_by(CycleCount.created_at.desc()))
    return list(result.scalars().all())


async def get_cycle_count_detail(session: AsyncSession, cc_id: UUID) -> Dict[str, Any]:
    cc = await session.get(CycleCount, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Cycle count not found")
    result = await session.execute(
        select(CycleCountItem)
        .where(CycleCountItem.cycle_count_id == cc_id)
        .options(selectinload(CycleCountItem.product))
    )
    items = result.scalars().all()
    return {
        "id": str(cc.id),
        "name": cc.name,
        "status": cc.status,
        "created_by": cc.created_by,
        "started_at": cc.started_at.isoformat() if cc.started_at else None,
        "completed_at": cc.completed_at.isoformat() if cc.completed_at else None,
        "items": [
            {
                "id": str(it.id),
                "product_id": str(it.product_id),
                "product_name": it.product.name if it.product else "",
                "sku": it.product.sku if it.product else "",
                "system_qty": it.system_qty,
                "counted_qty": it.counted_qty,
                "discrepancy": it.discrepancy,
                "is_adjusted": it.is_adjusted,
            }
            for it in items
        ],
    }


async def record_counts(session: AsyncSession, cc_id: UUID, counts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """counts: [{ item_id, counted_qty }]"""
    cc = await session.get(CycleCount, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Cycle count not found")
    if cc.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot edit a completed count")

    by_id = {str(c["item_id"]): int(c["counted_qty"]) for c in counts}
    result = await session.execute(
        select(CycleCountItem).where(CycleCountItem.cycle_count_id == cc_id)
    )
    for it in result.scalars().all():
        if str(it.id) in by_id:
            it.counted_qty = by_id[str(it.id)]
            it.discrepancy = it.counted_qty - it.system_qty

    await session.commit()
    return await get_cycle_count_detail(session, cc_id)


async def approve_adjustments(session: AsyncSession, cc_id: UUID) -> Dict[str, Any]:
    """Apply counted quantities: create adjustment movements and update product stock."""
    cc = await session.get(CycleCount, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Cycle count not found")

    result = await session.execute(
        select(CycleCountItem)
        .where(CycleCountItem.cycle_count_id == cc_id)
        .options(selectinload(CycleCountItem.product))
    )
    items = result.scalars().all()

    adjusted = 0
    for it in items:
        if it.counted_qty is None or it.is_adjusted or it.discrepancy == 0:
            continue
        product = it.product
        if product:
            product.current_stock = it.counted_qty
            session.add(StockMovement(
                product_id=it.product_id,
                movement_type="adjustment",
                quantity=it.discrepancy,
                reference=f"OPNAME-{str(cc.id)[:8]}",
                notes=f"Penyesuaian stok opname '{cc.name}'",
                created_by=cc.created_by or "opname",
            ))
        it.is_adjusted = True
        adjusted += 1

    cc.status = "completed"
    cc.completed_at = datetime.utcnow()
    await session.commit()
    return {"id": str(cc.id), "status": cc.status, "adjusted_items": adjusted}
