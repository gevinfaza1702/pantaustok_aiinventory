from enum import Enum

class ProductStatus(str, Enum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    OUT_OF_STOCK = "out_of_stock"

class SupplierStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class MovementType(str, Enum):
    IN = "in"
    OUT = "out"
    ADJUSTMENT = "adjustment"

class AlertType(str, Enum):
    LOW_STOCK = "low_stock"
    OVERSTOCK = "overstock"
    ANOMALY = "anomaly"
    EXPIRING = "expiring"

class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class ModelUsed(str, Enum):
    PROPHET = "prophet"
    SARIMA = "sarima"
    ENSEMBLE = "ensemble"
    NAIVE = "naive"
