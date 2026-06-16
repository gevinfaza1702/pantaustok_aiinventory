"""Scheduled Reports router."""

import io
from uuid import UUID
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.auth_service import get_current_user, require_roles
from services import report_service as svc

router = APIRouter(prefix="/reports", tags=["Scheduled Reports"])


class ScheduleCreate(BaseModel):
    name: str = Field(..., max_length=255)
    report_type: str = Field(..., description="inventory | pnl")
    frequency: str = Field("weekly", description="daily | weekly | monthly")
    recipients: List[str] = []


class GenerateRequest(BaseModel):
    report_type: str = Field(..., description="inventory | pnl")


@router.get("/schedules", response_model=List[Dict[str, Any]])
async def list_schedules(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await svc.list_schedules(db)


@router.post("/schedules", response_model=Dict[str, Any])
async def create_schedule(
    payload: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("manager")),
):
    schedule = await svc.create_schedule(
        db, payload.name, payload.report_type, payload.frequency, payload.recipients
    )
    schedule["email_enabled"] = svc.smtp_configured()
    return schedule


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("manager")),
):
    await svc.delete_schedule(db, schedule_id)
    return {"deleted": str(schedule_id)}


@router.post("/generate")
async def generate(
    payload: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Generate a PDF on-demand and stream it for download."""
    pdf = await svc.generate_report(db, payload.report_type)
    filename = f"{payload.report_type}_report.pdf"
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
