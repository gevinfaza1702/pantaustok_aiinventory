"""Custom Dashboard Builder service — save/load layouts per user."""

import json
from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.dashboard_models import DashboardLayout


def _serialize(layout: DashboardLayout) -> Dict[str, Any]:
    try:
        widgets = json.loads(layout.layout_json)
    except (ValueError, TypeError):
        widgets = []
    return {
        "id": str(layout.id),
        "name": layout.name,
        "widgets": widgets,
        "is_default": layout.is_default,
        "updated_at": layout.updated_at.isoformat() if layout.updated_at else None,
    }


async def list_layouts(session: AsyncSession, user_id: UUID) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(DashboardLayout).where(DashboardLayout.user_id == user_id)
        .order_by(DashboardLayout.created_at)
    )
    return [_serialize(l) for l in result.scalars().all()]


async def save_layout(session: AsyncSession, user_id: UUID, name: str, widgets: List[str]) -> Dict[str, Any]:
    layout = DashboardLayout(
        user_id=user_id, name=name or "My Dashboard",
        layout_json=json.dumps(widgets), is_default=True,
    )
    session.add(layout)
    await session.commit()
    await session.refresh(layout)
    return _serialize(layout)


async def update_layout(session: AsyncSession, layout_id: UUID, user_id: UUID,
                        name: str, widgets: List[str]) -> Dict[str, Any]:
    layout = await session.get(DashboardLayout, layout_id)
    if not layout or layout.user_id != user_id:
        raise HTTPException(status_code=404, detail="Layout not found")
    if name:
        layout.name = name
    layout.layout_json = json.dumps(widgets)
    layout.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(layout)
    return _serialize(layout)
