"""Profit & Loss Analytics router."""

from typing import Dict, Any, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.auth_service import get_current_user
from services import pnl_service

router = APIRouter(prefix="/pnl", tags=["Profit & Loss"])


@router.get("/overview", response_model=Dict[str, Any])
async def overview(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await pnl_service.get_profit_overview(db)


@router.get("/by-product", response_model=List[Dict[str, Any]])
async def by_product(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await pnl_service.get_profit_by_product(db)


@router.get("/by-category", response_model=List[Dict[str, Any]])
async def by_category(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await pnl_service.get_profit_by_category(db)


@router.get("/trend", response_model=Dict[str, Any])
async def trend(
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await pnl_service.get_profit_trend(db, period)


@router.get("/heatmap", response_model=Dict[str, Any])
async def heatmap(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await pnl_service.get_profit_heatmap(db)
