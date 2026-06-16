"""Stock Opname / Cycle Count models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class CycleCount(Base):
    """A stock-count session covering one or more products."""
    __tablename__ = "cycle_counts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True)
    status = Column(String(20), nullable=False, default="draft")  # draft, in_progress, completed
    created_by = Column(String(100), default="system")
    notes = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    items = relationship("CycleCountItem", back_populates="cycle_count", cascade="all, delete-orphan")


class CycleCountItem(Base):
    """One product line within a cycle count."""
    __tablename__ = "cycle_count_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_count_id = Column(UUID(as_uuid=True), ForeignKey("cycle_counts.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    system_qty = Column(Integer, nullable=False, default=0)
    counted_qty = Column(Integer, nullable=True)
    discrepancy = Column(Integer, default=0)
    is_adjusted = Column(Boolean, default=False)

    cycle_count = relationship("CycleCount", back_populates="items")
    product = relationship("Product")
