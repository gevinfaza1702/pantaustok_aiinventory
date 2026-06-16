"""E-Commerce Integration models (mock-ready)."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class EcommerceChannel(Base):
    __tablename__ = "ecommerce_channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform = Column(String(30), nullable=False)  # tokopedia, shopee, woocommerce
    store_name = Column(String(255), nullable=False)
    api_key = Column(String(255))  # placeholder for real credentials
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("EcommerceOrder", back_populates="channel", cascade="all, delete-orphan")


class EcommerceOrder(Base):
    __tablename__ = "ecommerce_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_channels.id"), nullable=False, index=True)
    external_order_id = Column(String(100), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    status = Column(String(30), default="new")  # new, processed
    synced_at = Column(DateTime, default=datetime.utcnow)

    channel = relationship("EcommerceChannel", back_populates="orders")
    product = relationship("Product")
