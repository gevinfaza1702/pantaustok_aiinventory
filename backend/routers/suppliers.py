from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from database import get_db
from models.schemas import SupplierCreate, SupplierUpdate, SupplierOut
from services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierOut])
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """List all suppliers."""
    return await SupplierService.get_all(session=db, skip=skip, limit=limit)

@router.post("", response_model=SupplierOut)
async def create_supplier(supplier_in: SupplierCreate, db: AsyncSession = Depends(get_db)):
    """Create a new supplier."""
    return await SupplierService.create(db, supplier_in)

@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_in: SupplierUpdate, 
    supplier_id: UUID = Path(...), 
    db: AsyncSession = Depends(get_db)
):
    """Update a supplier."""
    return await SupplierService.update(db, supplier_id, supplier_in)

@router.delete("/{supplier_id}", response_model=SupplierOut)
async def soft_delete_supplier(supplier_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    """Soft delete a supplier."""
    return await SupplierService.soft_delete(db, supplier_id)
