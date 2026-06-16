"""Scheduled Reports models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)   # inventory, pnl
    schedule_cron = Column(String(100), default="0 8 * * 1")  # default: Monday 08:00
    frequency = Column(String(20), default="weekly")    # daily, weekly, monthly
    recipients_json = Column(Text, default="[]")        # JSON list of emails
    last_sent = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
