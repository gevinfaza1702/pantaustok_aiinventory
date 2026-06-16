"""Reorder / Purchase Order router."""

from uuid import UUID
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.reorder_service import (
    generate_reorder_suggestions,
    create_purchase_order,
    list_purchase_orders,
    update_po_status,
)

router = APIRouter(prefix="/reorder", tags=["Smart Reorder"])


@router.get("/suggestions", response_model=List[Dict[str, Any]])
async def get_reorder_suggestions(db: AsyncSession = Depends(get_db)):
    """Return products that need reordering with suggested quantities."""
    return await generate_reorder_suggestions(db)


@router.get("/orders", response_model=List[Dict[str, Any]])
async def get_purchase_orders(db: AsyncSession = Depends(get_db)):
    """List all purchase orders."""
    orders = await list_purchase_orders(db)
    return [
        {
            "id": str(o.id),
            "product_id": str(o.product_id),
            "supplier_id": str(o.supplier_id) if o.supplier_id else None,
            "order_qty": o.order_qty,
            "unit_cost": float(o.unit_cost) if o.unit_cost else None,
            "total_cost": float(o.unit_cost or 0) * o.order_qty,
            "status": o.status,
            "trigger": o.trigger,
            "notes": o.notes,
            "created_at": o.created_at.isoformat(),
            "product_name": o.product.name if o.product else "",
            "supplier_name": o.supplier.name if o.supplier else "N/A",
        }
        for o in orders
    ]


@router.post("/orders", response_model=Dict[str, Any])
async def place_purchase_order(
    product_id: UUID,
    order_qty: int,
    trigger: str = "manual",
    notes: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Create a new Purchase Order for a product."""
    po = await create_purchase_order(db, product_id, order_qty, trigger, notes)
    return {"id": str(po.id), "status": po.status, "order_qty": po.order_qty}


@router.put("/orders/{po_id}/status")
async def update_order_status(
    po_id: UUID,
    status: str,
    db: AsyncSession = Depends(get_db),
):
    """Update PO status: pending → ordered → received / cancelled."""
    po = await update_po_status(db, po_id, status)
    return {"id": str(po.id), "status": po.status}
