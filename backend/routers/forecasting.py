from fastapi import APIRouter, Depends, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, List
from uuid import UUID

from database import get_db
from models.db_models import ForecastResult
from models.schemas import ForecastResultOut
from services.forecast_engine import ForecastEngine

router = APIRouter(prefix="/forecast", tags=["Forecasting"])

@router.post("/{product_id}", response_model=Dict[str, Any])
async def generate_forecast(
    product_id: UUID = Path(...), 
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate new forecast using Ensemble model (or naive fallback) for the next X days. 
    This triggers a re-computation and saves the results.
    """
    result = await ForecastEngine.generate_forecast(db, product_id, days)
    await ForecastEngine.save_forecast(db, product_id, result)
    return result

@router.get("/{product_id}", response_model=List[ForecastResultOut])
async def get_forecast(product_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    """
    Get the currently cached forecast results for a product.
    """
    query = select(ForecastResult)\
        .where(ForecastResult.product_id == product_id)\
        .order_by(ForecastResult.forecast_date)
        
    result = await db.execute(query)
    return list(result.scalars().all())

@router.get("/{product_id}/accuracy")
async def get_forecast_accuracy(product_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    """
    Mock endpoint for forecast accuracy (MAPE, RMSE, MAE).
    In a real system, we'd compare historical predictions vs actuals.
    """
    return {
        "product_id": product_id,
        "mape": 12.5,
        "rmse": 4.2,
        "mae": 3.8,
        "status": "Good"
    }
