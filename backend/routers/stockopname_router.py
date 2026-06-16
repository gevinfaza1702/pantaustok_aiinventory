"""Stock Opname / Cycle Count router."""

from uuid import UUID
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.auth_models import User
from services.auth_service import get_current_user, require_roles
from services import stockopname_service as svc

router = APIRouter(prefix="/stock-opname", tags=["Stock Opname"])


class CreateSession(BaseModel):
    name: str = Field(..., max_length=255)
    product_ids: Optional[List[UUID]] = None
    warehouse_id: Optional[UUID] = None


class CountItem(BaseModel):
    item_id: UUID
    counted_qty: int


class RecordCounts(BaseModel):
    items: List[CountItem]


@router.post("", response_model=Dict[str, Any])
async def create_session(
    payload: CreateSession,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cc = await svc.create_cycle_count(
        db, payload.name, payload.product_ids, payload.warehouse_id, created_by=user.username
    )
    return {"id": str(cc.id), "name": cc.name, "status": cc.status}


@router.get("", response_model=List[Dict[str, Any]])
async def list_sessions(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    sessions = await svc.list_cycle_counts(db)
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "status": s.status,
            "created_by": s.created_by,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in sessions
    ]


@router.get("/{cc_id}", response_model=Dict[str, Any])
async def session_detail(cc_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await svc.get_cycle_count_detail(db, cc_id)


@router.put("/{cc_id}/items", response_model=Dict[str, Any])
async def record_counts(
    cc_id: UUID,
    payload: RecordCounts,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    counts = [{"item_id": i.item_id, "counted_qty": i.counted_qty} for i in payload.items]
    return await svc.record_counts(db, cc_id, counts)


@router.post("/{cc_id}/approve", response_model=Dict[str, Any])
async def approve(
    cc_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("manager")),
):
    return await svc.approve_adjustments(db, cc_id)
