"""Multi-Warehouse router."""

from uuid import UUID
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.auth_service import get_current_user, require_roles
from services import warehouse_service as svc

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


class WarehouseCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    address: str = ""
    is_default: bool = False


class TransferRequest(BaseModel):
    from_warehouse_id: UUID
    to_warehouse_id: UUID
    product_id: UUID
    quantity: int = Field(..., gt=0)
    notes: str = ""


def _wh_out(w) -> Dict[str, Any]:
    return {
        "id": str(w.id), "name": w.name, "code": w.code,
        "address": w.address, "is_default": w.is_default, "is_active": w.is_active,
    }


@router.get("", response_model=List[Dict[str, Any]])
async def list_warehouses(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return [_wh_out(w) for w in await svc.list_warehouses(db)]


@router.post("", response_model=Dict[str, Any])
async def create_warehouse(
    payload: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("manager")),
):
    w = await svc.create_warehouse(db, payload.name, payload.code, payload.address, payload.is_default)
    return _wh_out(w)


@router.get("/consolidated", response_model=Dict[str, Any])
async def consolidated(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await svc.get_consolidated(db)


@router.get("/{warehouse_id}/stock", response_model=List[Dict[str, Any]])
async def warehouse_stock(warehouse_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await svc.get_warehouse_stock(db, warehouse_id)


@router.post("/transfer", response_model=Dict[str, Any])
async def transfer(
    payload: TransferRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("manager")),
):
    tr = await svc.transfer_stock(
        db, payload.from_warehouse_id, payload.to_warehouse_id,
        payload.product_id, payload.quantity, payload.notes,
    )
    return {"id": str(tr.id), "status": tr.status, "quantity": tr.quantity}
