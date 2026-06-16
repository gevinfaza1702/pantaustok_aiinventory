"""Analytics extension router: ABC, Dead Stock, Supplier Performance."""

from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.analytics_extension import (
    get_abc_analysis,
    get_dead_stock,
    get_supplier_performance,
)

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


@router.get("/abc", response_model=Dict[str, Any])
async def abc_analysis(db: AsyncSession = Depends(get_db)):
    """Pareto (ABC) classification of all active products by inventory value."""
    return await get_abc_analysis(db)


@router.get("/dead-stock", response_model=List[Dict[str, Any]])
async def dead_stock(
    days: int = Query(30, ge=7, le=365, description="Days of inactivity threshold"),
    db: AsyncSession = Depends(get_db),
):
    """Products with no outbound movement in the last N days."""
    return await get_dead_stock(db, days_threshold=days)


@router.get("/supplier-performance", response_model=List[Dict[str, Any]])
async def supplier_performance(db: AsyncSession = Depends(get_db)):
    """Comprehensive supplier performance dashboard data."""
    return await get_supplier_performance(db)
