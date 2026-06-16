"""Custom Dashboard Builder router."""

from uuid import UUID
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.auth_models import User
from services.auth_service import get_current_user
from services import dashboard_service as svc

router = APIRouter(prefix="/dashboard", tags=["Dashboard Builder"])


class LayoutPayload(BaseModel):
    name: str = Field("My Dashboard", max_length=255)
    widgets: List[str] = []


@router.get("/layouts", response_model=List[Dict[str, Any]])
async def list_layouts(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.list_layouts(db, user.id)


@router.post("/layouts", response_model=Dict[str, Any])
async def save_layout(
    payload: LayoutPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await svc.save_layout(db, user.id, payload.name, payload.widgets)


@router.put("/layouts/{layout_id}", response_model=Dict[str, Any])
async def update_layout(
    layout_id: UUID,
    payload: LayoutPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await svc.update_layout(db, layout_id, user.id, payload.name, payload.widgets)
