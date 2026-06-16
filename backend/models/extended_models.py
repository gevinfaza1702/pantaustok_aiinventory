import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class PurchaseOrder(Base):
    """Smart Reorder System — generated POs for low-stock products."""
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    order_qty = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(12, 2))
    status = Column(String(20), nullable=False, default="pending")  # pending, ordered, received, cancelled
    trigger = Column(String(50), default="manual")  # manual, auto_reorder
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product")
    supplier = relationship("Supplier")


class AuditLog(Base):
    """Audit Trail — every user action is recorded here."""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False)   # product, supplier, movement, etc.
    entity_id = Column(String(100))
    action = Column(String(50), nullable=False)         # create, update, delete, scan, import
    actor = Column(String(100), default="Admin User")
    description = Column(Text)
    old_value = Column(Text)                            # JSON-serialised snapshot before
    new_value = Column(Text)                            # JSON-serialised snapshot after
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
