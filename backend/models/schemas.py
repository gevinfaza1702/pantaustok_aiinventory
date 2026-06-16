from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum
from .enums import ProductStatus, SupplierStatus, MovementType, AlertType, AlertSeverity, ModelUsed

# --- Common Config ---
class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# --- Supplier Schemas ---
class SupplierBase(BaseModel):
    name: str = Field(..., max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    reliability_score: float = Field(0.90, ge=0.0, le=1.0)
    status: SupplierStatus = SupplierStatus.ACTIVE

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    reliability_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    status: Optional[SupplierStatus] = None

class SupplierOut(SupplierBase, ORMBase):
    id: UUID
    created_at: datetime


# --- Product Schemas ---
class ProductBase(BaseModel):
    sku: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: str = Field(..., max_length=100)
    unit: str = Field(..., max_length=20)
    current_stock: int = Field(0, ge=0)
    min_stock: int = Field(10, ge=0)
    max_stock: Optional[int] = Field(None, ge=0)
    cost_price: float = Field(..., ge=0)
    sell_price: float = Field(..., ge=0)
    supplier_id: Optional[UUID] = None
    lead_time_days: int = Field(7, ge=0)
    status: ProductStatus = ProductStatus.ACTIVE

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    unit: Optional[str] = Field(None, max_length=20)
    current_stock: Optional[int] = Field(None, ge=0)
    min_stock: Optional[int] = Field(None, ge=0)
    max_stock: Optional[int] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    sell_price: Optional[float] = Field(None, ge=0)
    supplier_id: Optional[UUID] = None
    lead_time_days: Optional[int] = Field(None, ge=0)
    status: Optional[ProductStatus] = None

class ProductOut(ProductBase, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# --- Stock Movement Schemas ---
class StockMovementBase(BaseModel):
    product_id: UUID
    movement_type: MovementType
    quantity: int
    reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    unit_cost: Optional[float] = None
    created_by: str = Field("system", max_length=100)

class StockMovementCreate(StockMovementBase):
    pass

class StockMovementOut(StockMovementBase, ORMBase):
    id: UUID
    created_at: datetime

class StockMovementHistoryOut(StockMovementOut):
    product_name: str
    previous_stock: int
    new_stock: int


# --- Forecast Schemas ---
class ForecastResultBase(BaseModel):
    product_id: UUID
    forecast_date: datetime
    predicted_demand: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    model_used: Optional[ModelUsed] = None

class ForecastResultOut(ForecastResultBase, ORMBase):
    id: UUID
    created_at: datetime


# --- Alert Rule Schemas ---
class AlertRuleBase(BaseModel):
    product_id: Optional[UUID] = None
    rule_type: AlertType
    threshold_value: Optional[float] = None
    is_active: bool = True

class AlertRuleCreate(AlertRuleBase):
    pass

class AlertRuleUpdate(BaseModel):
    threshold_value: Optional[float] = None
    is_active: Optional[bool] = None

class AlertRuleOut(AlertRuleBase, ORMBase):
    id: UUID
    last_triggered: Optional[datetime] = None
    created_at: datetime


# --- Active Alert Schemas ---
class ActiveAlertBase(BaseModel):
    rule_id: Optional[UUID] = None
    product_id: Optional[UUID] = None
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    is_read: bool = False

class ActiveAlertOut(ActiveAlertBase, ORMBase):
    id: UUID
    resolved_at: Optional[datetime] = None
    created_at: datetime

class ActiveAlertUpdate(BaseModel):
    is_read: bool
    resolved_at: Optional[datetime] = None

# --- Analytics / Dashboard ---
class KPIData(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    total_inventory_value: float
    avg_turnover_rate: float
    pending_alerts: int
    forecast_accuracy_mape: float

class DashboardOut(BaseModel):
    kpis: KPIData
    charts: dict  # Will be shaped dynamically
