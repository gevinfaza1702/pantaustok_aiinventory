"""Audit trail router."""

from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.audit_service import get_audit_logs

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/logs", response_model=List[Dict[str, Any]])
async def fetch_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    entity_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Return recent audit log entries."""
    return await get_audit_logs(db, limit=limit, entity_type=entity_type)
