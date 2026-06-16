"""Multi-Warehouse service: CRUD, per-location stock, transfers, consolidated view."""

from uuid import UUID
from typing import List, Dict, Any

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.db_models import Product
from models.warehouse_models import Warehouse, WarehouseStock, StockTransfer


async def list_warehouses(session: AsyncSession) -> List[Warehouse]:
    result = await session.execute(select(Warehouse).order_by(Warehouse.created_at))
    return list(result.scalars().all())


async def create_warehouse(session: AsyncSession, name: str, code: str,
                           address: str = "", is_default: bool = False) -> Warehouse:
    existing = await session.execute(select(Warehouse).where(Warehouse.code == code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Warehouse code already exists")
    wh = Warehouse(name=name, code=code, address=address, is_default=is_default)
    session.add(wh)
    await session.commit()
    await session.refresh(wh)
    return wh


async def _get_or_create_stock(session: AsyncSession, warehouse_id: UUID, product_id: UUID) -> WarehouseStock:
    result = await session.execute(
        select(WarehouseStock).where(
            WarehouseStock.warehouse_id == warehouse_id,
            WarehouseStock.product_id == product_id,
        )
    )
    ws = result.scalar_one_or_none()
    if ws is None:
        ws = WarehouseStock(warehouse_id=warehouse_id, product_id=product_id, quantity=0)
        session.add(ws)
        await session.flush()
    return ws


async def get_warehouse_stock(session: AsyncSession, warehouse_id: UUID) -> List[Dict[str, Any]]:
    wh = await session.get(Warehouse, warehouse_id)
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    result = await session.execute(
        select(WarehouseStock)
        .where(WarehouseStock.warehouse_id == warehouse_id)
        .options(selectinload(WarehouseStock.product))
    )
    rows = result.scalars().all()
    return [
        {
            "product_id": str(r.product_id),
            "product_name": r.product.name if r.product else "",
            "sku": r.product.sku if r.product else "",
            "quantity": r.quantity,
        }
        for r in rows
    ]


async def transfer_stock(session: AsyncSession, from_id: UUID, to_id: UUID,
                         product_id: UUID, quantity: int, notes: str = "") -> StockTransfer:
    if from_id == to_id:
        raise HTTPException(status_code=400, detail="Source and destination must differ")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    src = await _get_or_create_stock(session, from_id, product_id)
    if src.quantity < quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock at source warehouse")
    dst = await _get_or_create_stock(session, to_id, product_id)

    src.quantity -= quantity
    dst.quantity += quantity

    transfer = StockTransfer(
        from_warehouse_id=from_id, to_warehouse_id=to_id,
        product_id=product_id, quantity=quantity, notes=notes, status="completed",
    )
    session.add(transfer)
    await session.commit()
    await session.refresh(transfer)
    return transfer


async def get_consolidated(session: AsyncSession) -> Dict[str, Any]:
    """Summary per warehouse + total units across all locations."""
    warehouses = await list_warehouses(session)

    totals = await session.execute(
        select(WarehouseStock.warehouse_id, func.coalesce(func.sum(WarehouseStock.quantity), 0))
        .group_by(WarehouseStock.warehouse_id)
    )
    by_wh = {str(wid): int(qty) for wid, qty in totals.all()}

    skus = await session.execute(
        select(WarehouseStock.warehouse_id, func.count(WarehouseStock.product_id))
        .where(WarehouseStock.quantity > 0)
        .group_by(WarehouseStock.warehouse_id)
    )
    sku_by_wh = {str(wid): int(c) for wid, c in skus.all()}

    summary = [
        {
            "id": str(w.id),
            "name": w.name,
            "code": w.code,
            "is_default": w.is_default,
            "is_active": w.is_active,
            "total_units": by_wh.get(str(w.id), 0),
            "sku_count": sku_by_wh.get(str(w.id), 0),
        }
        for w in warehouses
    ]
    return {
        "warehouses": summary,
        "total_units_all": sum(by_wh.values()),
        "warehouse_count": len(warehouses),
    }
