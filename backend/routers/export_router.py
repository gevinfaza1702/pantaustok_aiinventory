"""Export router - CSV downloads for inventory, movements, and suppliers."""

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.export_service import (
    export_inventory_csv,
    export_movements_csv,
    export_suppliers_csv,
)

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/inventory.csv")
async def download_inventory(db: AsyncSession = Depends(get_db)):
    """Download inventory valuation as CSV."""
    data = await export_inventory_csv(db)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory.csv"},
    )


@router.get("/movements.csv")
async def download_movements(days: int = 30, db: AsyncSession = Depends(get_db)):
    """Download stock movement log as CSV (last N days)."""
    data = await export_movements_csv(db, days=days)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=movements.csv"},
    )


@router.get("/suppliers.csv")
async def download_suppliers(db: AsyncSession = Depends(get_db)):
    """Download supplier list as CSV."""
    data = await export_suppliers_csv(db)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=suppliers.csv"},
    )
