from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.schemas import ActiveAlertOut, AlertRuleOut, AlertRuleCreate
from services.alert_service import AlertService
from models.db_models import AlertRule

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[ActiveAlertOut])
async def list_active_alerts(
    is_read: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List active alerts, optionally filtering by is_read status."""
    return await AlertService.get_active_alerts(db, is_read)

@router.put("/{alert_id}/read", response_model=ActiveAlertOut)
async def mark_alert_read(alert_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    """Mark an alert as read."""
    from fastapi import HTTPException
    alert = await AlertService.mark_as_read(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.get("/rules", response_model=List[AlertRuleOut])
async def list_alert_rules(db: AsyncSession = Depends(get_db)):
    """List configured alert rules."""
    from sqlalchemy import select
    result = await db.execute(select(AlertRule))
    return list(result.scalars().all())

@router.post("/rules", response_model=AlertRuleOut)
async def create_alert_rule(rule_in: AlertRuleCreate, db: AsyncSession = Depends(get_db)):
    """Create a new alert rule configuration."""
    rule = AlertRule(**rule_in.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

@router.post("/evaluate")
async def trigger_evaluation(db: AsyncSession = Depends(get_db)):
    """Trigger manual evaluation of stock levels to generate alerts."""
    await AlertService.evaluate_stock_levels(db)
    return {"message": "Evaluation completed."}
