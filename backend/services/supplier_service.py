from uuid import UUID
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from models.db_models import Supplier
from models.schemas import SupplierCreate, SupplierUpdate
from models.enums import SupplierStatus

class SupplierService:
    @staticmethod
    async def get_all(session: AsyncSession, skip: int = 0, limit: int = 100) -> List[Supplier]:
        """Retrieve a paginated list of all suppliers."""
        query = select(Supplier).offset(skip).limit(limit)
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(session: AsyncSession, supplier_id: UUID) -> Optional[Supplier]:
        """Retrieve a single supplier by their UUID."""
        query = select(Supplier).where(Supplier.id == supplier_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(session: AsyncSession, supplier_in: SupplierCreate) -> Supplier:
        """Create a new supplier."""
        new_supplier = Supplier(**supplier_in.model_dump())
        session.add(new_supplier)
        await session.commit()
        await session.refresh(new_supplier)
        return new_supplier

    @staticmethod
    async def update(session: AsyncSession, supplier_id: UUID, supplier_in: SupplierUpdate) -> Supplier:
        """Update an existing supplier."""
        supplier = await SupplierService.get_by_id(session, supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )
            
        update_data = supplier_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(supplier, field, value)
            
        session.add(supplier)
        await session.commit()
        await session.refresh(supplier)
        return supplier

    @staticmethod
    async def soft_delete(session: AsyncSession, supplier_id: UUID) -> Supplier:
        """Soft delete a supplier by setting their status to INACTIVE."""
        supplier = await SupplierService.get_by_id(session, supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )
            
        supplier.status = SupplierStatus.INACTIVE.value
        session.add(supplier)
        await session.commit()
        await session.refresh(supplier)
        return supplier
