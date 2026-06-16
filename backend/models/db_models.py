import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Text, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    reliability_score = Column(Numeric(3, 2), default=0.90)  # 0.00 - 1.00
    status = Column(String(20), default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="supplier")

class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    current_stock = Column(Integer, nullable=False, default=0)
    min_stock = Column(Integer, nullable=False, default=10)
    max_stock = Column(Integer, nullable=True)
    cost_price = Column(Numeric(12, 2), nullable=False)
    sell_price = Column(Numeric(12, 2), nullable=False)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey('suppliers.id'), nullable=True)
    lead_time_days = Column(Integer, default=7)
    status = Column(String(20), default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    supplier = relationship("Supplier", back_populates="products")
    movements = relationship("StockMovement", back_populates="product")
    forecasts = relationship("ForecastResult", back_populates="product")
    alert_rules = relationship("AlertRule", back_populates="product")

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False, index=True)
    movement_type = Column(String(20), nullable=False, index=True) # in, out, adjustment
    quantity = Column(Integer, nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey('warehouses.id'), nullable=True, index=True)
    reference = Column(String(100))
    notes = Column(Text)
    unit_cost = Column(Numeric(12, 2))
    created_by = Column(String(100), default='system')
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    product = relationship("Product", back_populates="movements")

class ForecastResult(Base):
    __tablename__ = "forecast_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    forecast_date = Column(DateTime, nullable=False)
    predicted_demand = Column(Numeric(10, 2), nullable=False)
    lower_bound = Column(Numeric(10, 2))
    upper_bound = Column(Numeric(10, 2))
    model_used = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="forecasts")

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=True) # NULL = global
    rule_type = Column(String(50), nullable=False) # low_stock, overstock, anomaly, expiring
    threshold_value = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="alert_rules")
    alerts = relationship("ActiveAlert", back_populates="rule")

class ActiveAlert(Base):
    __tablename__ = "active_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey('alert_rules.id'), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=True)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False) # critical, warning, info
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    rule = relationship("AlertRule", back_populates="alerts")
    product = relationship("Product")
