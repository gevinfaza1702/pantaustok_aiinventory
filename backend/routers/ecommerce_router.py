"""E-Commerce Integration router (mock)."""

from uuid import UUID
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.auth_service import get_current_user, require_roles
from services import ecommerce_service as svc

router = APIRouter(prefix="/ecommerce", tags=["E-Commerce"])


class ChannelCreate(BaseModel):
    platform: str = Field(..., description="tokopedia | shopee | woocommerce")
    store_name: str = Field(..., max_length=255)
    api_key: str = ""


@router.get("/channels", response_model=List[Dict[str, Any]])
async def list_channels(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await svc.list_channels(db)


@router.post("/channels", response_model=Dict[str, Any])
async def create_channel(
    payload: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("manager")),
):
    c = await svc.create_channel(db, payload.platform, payload.store_name, payload.api_key)
    return {"id": str(c.id), "platform": c.platform, "store_name": c.store_name}


@router.post("/channels/{channel_id}/sync", response_model=Dict[str, Any])
async def sync_channel(
    channel_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("manager")),
):
    return await svc.sync_channel(db, channel_id)


@router.get("/orders", response_model=List[Dict[str, Any]])
async def list_orders(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await svc.list_orders(db)
