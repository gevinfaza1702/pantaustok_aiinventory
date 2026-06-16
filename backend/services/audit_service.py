"""
Audit Trail Service
Records every significant action in the system for compliance and debugging.
"""

import json
from datetime import datetime
from typing import Optional, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.extended_models import AuditLog


async def log_action(
    session: AsyncSession,
    entity_type: str,
    action: str,
    description: str,
    entity_id: Optional[str] = None,
    actor: str = "Admin User",
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
) -> None:
    """Write a single audit log entry. Fire and forget — never raises."""
    try:
        entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=actor,
            description=description,
            old_value=json.dumps(old_value, default=str) if old_value is not None else None,
            new_value=json.dumps(new_value, default=str) if new_value is not None else None,
        )
        session.add(entry)
        await session.commit()
    except Exception:
        pass  # Audit failures must never break main flow


async def get_audit_logs(
    session: AsyncSession,
    limit: int = 100,
    entity_type: Optional[str] = None,
) -> list:
    """Fetch recent audit logs, optionally filtered by entity type."""
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    result = await session.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "actor": log.actor,
            "description": log.description,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
