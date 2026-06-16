"""Custom Dashboard Builder models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class DashboardLayout(Base):
    """A saved dashboard layout (widget arrangement) for a user."""
    __tablename__ = "dashboard_layouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="My Dashboard")
    layout_json = Column(Text, nullable=False, default="[]")  # JSON array of widget keys
    is_default = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
