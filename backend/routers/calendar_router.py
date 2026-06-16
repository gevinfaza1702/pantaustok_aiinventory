"""Inventory Calendar router."""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.auth_service import get_current_user
from services.calendar_service import get_calendar_events

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/events", response_model=List[Dict[str, Any]])
async def calendar_events(
    start: Optional[str] = Query(None, description="ISO date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="ISO date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Return events within the date range (defaults to current month ±)."""
    now = datetime.utcnow()
    start_dt = datetime.fromisoformat(start) if start else now - timedelta(days=15)
    end_dt = datetime.fromisoformat(end) if end else now + timedelta(days=45)
    # Make end inclusive of the whole day
    end_dt = end_dt.replace(hour=23, minute=59, second=59)
    return await get_calendar_events(db, start_dt, end_dt)
