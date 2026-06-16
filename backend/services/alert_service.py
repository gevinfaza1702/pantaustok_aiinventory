from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from models.db_models import AlertRule, ActiveAlert, Product
from models.enums import AlertType, AlertSeverity

class AlertService:
    @staticmethod
    async def get_active_alerts(session: AsyncSession, is_read: Optional[bool] = False) -> List[ActiveAlert]:
        """Fetch active alerts, optionally filtered by read status."""
        query = select(ActiveAlert)
        if is_read is not None:
            query = query.where(ActiveAlert.is_read == is_read)
        query = query.order_by(ActiveAlert.created_at.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def mark_as_read(session: AsyncSession, alert_id: UUID) -> ActiveAlert:
        """Mark a specific alert as read."""
        query = select(ActiveAlert).where(ActiveAlert.id == alert_id)
        result = await session.execute(query)
        alert = result.scalar_one_or_none()
        
        if alert:
            alert.is_read = True
            alert.resolved_at = datetime.utcnow()
            session.add(alert)
            await session.commit()
            await session.refresh(alert)
        return alert

    @staticmethod
    async def evaluate_stock_levels(session: AsyncSession):
        """
        Scans all products and creates alerts if stock is below min_stock or 0.
        To be run periodically (e.g., cron or background task).
        """
        query = select(Product).where(Product.current_stock <= Product.min_stock)
        result = await session.execute(query)
        products = result.scalars().all()
        
        new_alerts = []
        for p in products:
            if p.current_stock == 0:
                # Check if OOS alert already exists and is unread
                check_q = select(ActiveAlert).where(
                    ActiveAlert.product_id == p.id,
                    ActiveAlert.alert_type == AlertType.LOW_STOCK.value,
                    ActiveAlert.is_read == False,
                    ActiveAlert.severity == AlertSeverity.CRITICAL.value
                )
                res = await session.execute(check_q)
                if not res.scalar_one_or_none():
                    new_alerts.append(ActiveAlert(
                        product_id=p.id,
                        alert_type=AlertType.LOW_STOCK.value,
                        severity=AlertSeverity.CRITICAL.value,
                        message=f"{p.name} is OUT OF STOCK. Immediate reorder required."
                    ))
            elif p.current_stock <= p.min_stock:
                # Warning for low stock
                check_q = select(ActiveAlert).where(
                    ActiveAlert.product_id == p.id,
                    ActiveAlert.alert_type == AlertType.LOW_STOCK.value,
                    ActiveAlert.is_read == False,
                    ActiveAlert.severity == AlertSeverity.WARNING.value
                )
                res = await session.execute(check_q)
                if not res.scalar_one_or_none():
                    new_alerts.append(ActiveAlert(
                        product_id=p.id,
                        alert_type=AlertType.LOW_STOCK.value,
                        severity=AlertSeverity.WARNING.value,
                        message=f"{p.name} has dropped below min stock level ({p.current_stock}/{p.min_stock})."
                    ))
                    
        if new_alerts:
            session.add_all(new_alerts)
            await session.commit()
