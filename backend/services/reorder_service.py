"""
Smart Reorder Service
Calculates optimal reorder quantities and generates Purchase Orders
for products that fall at or below their minimum stock level.
"""

from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.db_models import Product, Supplier, StockMovement
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
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po.status = status
    if status == "ordered" and not po.ordered_at:
        po.ordered_at = datetime.utcnow()
        # Estimate expected arrival from the product's lead time
        product = await session.get(Product, po.product_id)
        lead = product.lead_time_days if product and product.lead_time_days else 7
        po.expected_arrival = datetime.utcnow() + timedelta(days=lead)
    po.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(po)
    return po


async def receive_purchase_order(
    session: AsyncSession, po_id: UUID, received_qty: int, create_movement: bool = True
) -> PurchaseOrder:
    """
    Record a (partial or full) receipt against a PO.
    Creates an inbound StockMovement, updates the product stock,
    and refreshes the supplier reliability score based on delivery timeliness.
    """
    po = await session.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if received_qty <= 0:
        raise HTTPException(status_code=400, detail="Received quantity must be positive")

    already = po.received_qty or 0
    if already + received_qty > po.order_qty:
        raise HTTPException(status_code=400, detail="Received exceeds ordered quantity")

    po.received_qty = already + received_qty
    po.actual_arrival = datetime.utcnow()

    if po.received_qty >= po.order_qty:
        po.status = "received"
        po.partial_received = False
    else:
        po.status = "partial"
        po.partial_received = True

    # Bump product stock + audit via a stock movement
    product = await session.get(Product, po.product_id)
    if product and create_movement:
        product.current_stock = (product.current_stock or 0) + received_qty
        movement = StockMovement(
            product_id=po.product_id,
            movement_type="in",
            quantity=received_qty,
            reference=f"PO-{str(po.id)[:8]}",
            notes="Goods received against purchase order",
            unit_cost=po.unit_cost,
            created_by="reorder",
        )
        session.add(movement)

    # Update supplier reliability if we have an expectation to compare against
    if po.supplier_id and po.expected_arrival and po.status == "received":
        await _refresh_supplier_reliability(session, po.supplier_id, po.expected_arrival, po.actual_arrival)

    po.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(po)
    return po


async def _refresh_supplier_reliability(
    session: AsyncSession, supplier_id: UUID, expected: datetime, actual: datetime
) -> None:
    """Nudge the supplier reliability score toward on-time performance."""
    supplier = await session.get(Supplier, supplier_id)
    if not supplier:
        return
    on_time = actual <= expected
    current = float(supplier.reliability_score or 0.9)
    # Exponential moving average toward 1.0 (on time) or 0.6 (late)
    target = 1.0 if on_time else 0.6
    supplier.reliability_score = round(current * 0.8 + target * 0.2, 2)


def get_po_timeline(po: PurchaseOrder) -> List[Dict[str, Any]]:
    """Build an ordered lifecycle timeline for a PO."""
    events = [{"stage": "created", "label": "PO Dibuat", "at": po.created_at.isoformat() if po.created_at else None, "done": True}]
    events.append({
        "stage": "ordered", "label": "Dipesan ke Pemasok",
        "at": po.ordered_at.isoformat() if po.ordered_at else None,
        "done": po.ordered_at is not None,
    })
    events.append({
        "stage": "expected", "label": "Perkiraan Tiba",
        "at": po.expected_arrival.isoformat() if po.expected_arrival else None,
        "done": po.actual_arrival is not None,
    })
    received_label = "Diterima"
    if po.partial_received:
        received_label = f"Diterima Sebagian ({po.received_qty}/{po.order_qty})"
    events.append({
        "stage": "received", "label": received_label,
        "at": po.actual_arrival.isoformat() if po.actual_arrival else None,
        "done": po.status == "received",
    })
    return events


def calculate_lead_time_accuracy(po: PurchaseOrder) -> Optional[Dict[str, Any]]:
    """Compare expected vs actual arrival for a received PO."""
    if not po.expected_arrival or not po.actual_arrival:
        return None
    delta_days = (po.actual_arrival - po.expected_arrival).days
    return {
        "expected_arrival": po.expected_arrival.isoformat(),
        "actual_arrival": po.actual_arrival.isoformat(),
        "delta_days": delta_days,
        "on_time": delta_days <= 0,
    }
