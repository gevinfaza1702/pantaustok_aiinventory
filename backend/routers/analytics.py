from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from database import get_db
from models.schemas import DashboardOut
from services.analytics_service import AnalyticsService
from services.ai_service import generate_inventory_insights

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=DashboardOut)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """Get all dashboard KPIs and Chart data in one call."""
    kpis = await AnalyticsService.get_dashboard_kpis(db)
    charts = await AnalyticsService.get_dashboard_charts(db)
    
    return {
        "kpis": kpis,
        "charts": charts
    }

@router.get("/insights")
async def get_dashboard_insights(db: AsyncSession = Depends(get_db)):
    """
    Generate SumoPod AI narrative insights based on current dashboard data.
    """
    kpis = await AnalyticsService.get_dashboard_kpis(db)
    charts = await AnalyticsService.get_dashboard_charts(db)
    
    # Dump the pydantic models to dicts for the LLM
    kpi_dict = kpis.model_dump() if hasattr(kpis, "model_dump") else kpis
    chart_dict = charts.model_dump() if hasattr(charts, "model_dump") else charts
    
    dashboard_data = {
        "kpis": kpi_dict,
        "charts": chart_dict
    }

    insight_text = await generate_inventory_insights(dashboard_data)
    
    return {"insights": insight_text}

@router.get("/abc")
async def get_abc_analysis(db: AsyncSession = Depends(get_db)):
    """Mock endpoint for ABC stock classification."""
    return {"message": "ABC calculation not fully implemented in demo, but endpoint is active.", "data": []}

@router.get("/turnover")
async def get_turnover_rates(db: AsyncSession = Depends(get_db)):
    """Mock endpoint for turnover rates by product."""
    return {"message": "Turnover details by product endpoint is active.", "data": []}
