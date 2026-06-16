from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from models.schemas import StockMovementCreate, StockMovementHistoryOut
from services.stock_service import StockService

router = APIRouter(prefix="/movements", tags=["Stock Movements"])

@router.get("", response_model=List[StockMovementHistoryOut])
async def list_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    product_id: Optional[UUID] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """List movements globally with optional filtering."""
    movements = await StockService.get_movements(
        session=db, skip=skip, limit=limit,
        product_id=product_id, movement_type=movement_type,
        start_date=start_date, end_date=end_date
    )
    
    # Map to schema natively mapping joined product_name
    return [{
        **m.__dict__,
        "product_name": m.product.name,
        "previous_stock": m.quantity, # Stub simplified historical context for global view since calculating per row is heavy
        "new_stock": m.quantity # Stub
    } for m in movements]

@router.post("", response_model=StockMovementHistoryOut)
async def record_movement(movement_in: StockMovementCreate, db: AsyncSession = Depends(get_db)):
    """Record a new movement and auto-update stock."""
    return await StockService.record_movement(db, movement_in)

@router.get("/product/{product_id}", response_model=List[StockMovementHistoryOut])
async def get_product_movements(
    product_id: UUID = Path(...),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """Movement history targeting a specific product."""
    movements = await StockService.get_product_history(db, product_id, limit)
    
    # We must construct the historical trace
    history = []
    current = movements[0].product.current_stock if movements else 0
    
    for m in movements: # Iterate backwards in time (query is desc)
        new = current
        prev = current - m.quantity
        
        history.append({
            **m.__dict__,
            "product_name": m.product.name,
            "previous_stock": prev,
            "new_stock": new
        })
        current = prev
        
    return history
