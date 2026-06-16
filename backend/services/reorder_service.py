"""
Smart Reorder Service
Calculates optimal reorder quantities and generates Purchase Orders
for products that fall at or below their minimum stock level.
"""

from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.db_models import Product, Supplier
from models.extended_models import PurchaseOrder


def _calculate_reorder_qty(product: Product, forecast_demand_30d: float) -> int:
    """
    Optimal reorder qty = forecasted 30d demand + safety buffer (20%)
    capped to fill up to max_stock if defined.
    """
    base_qty = max(1, round(forecast_demand_30d * 1.20))

    if product.max_stock:
        fill_to_max = product.max_stock - product.current_stock
        base_qty = min(base_qty, fill_to_max)

    return max(1, base_qty)


async def generate_reorder_suggestions(session: AsyncSession) -> List[Dict[str, Any]]:
    """Return all products that need reordering with suggested PO details."""
    query = (
        select(Product)
        .where(Product.status == "active")
        .where(Product.current_stock <= Product.min_stock)
    )
    result = await session.execute(query)
    products = result.scalars().all()

    suggestions = []
    for p in products:
        urgency = "critical" if p.current_stock == 0 else "warning"
        suggestions.append({
            "product_id": str(p.id),
            "product_name": p.name,
            "sku": p.sku,
            "supplier_id": str(p.supplier_id) if p.supplier_id else None,
            "current_stock": p.current_stock,
            "min_stock": p.min_stock,
            "max_stock": p.max_stock,
            "lead_time_days": p.lead_time_days,
            "suggested_qty": _calculate_reorder_qty(p, forecast_demand_30d=50),
            "unit_cost": float(p.cost_price),
            "urgency": urgency,
        })

    return suggestions


async def create_purchase_order(
    session: AsyncSession,
    product_id: UUID,
    order_qty: int,
    trigger: str = "manual",
    notes: str = "",
) -> PurchaseOrder:
    """Persist a new PurchaseOrder record."""
    product = await session.get(Product, product_id)
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")

    po = PurchaseOrder(
        product_id=product_id,
        supplier_id=product.supplier_id,
        order_qty=order_qty,
        unit_cost=product.cost_price,
        trigger=trigger,
        notes=notes,
    )
    session.add(po)
    await session.commit()
    await session.refresh(po)
    return po


async def list_purchase_orders(session: AsyncSession) -> List[PurchaseOrder]:
    """Return all POs, newest first."""
    result = await session.execute(
        select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc())
    )
    return list(result.scalars().all())


async def update_po_status(session: AsyncSession, po_id: UUID, status: str) -> PurchaseOrder:
    """Update the status of a PO (e.g. ordered → received)."""
    po = await session.get(PurchaseOrder, po_id)
    if not po:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po.status = status
    po.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(po)
    return po
