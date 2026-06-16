from uuid import UUID
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status

from models.db_models import StockMovement, Product
from models.schemas import StockMovementCreate
from models.enums import MovementType
from services.product_service import ProductService

class StockService:
    @staticmethod
    async def get_movements(
        session: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        product_id: Optional[UUID] = None,
        movement_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[StockMovement]:
        """
        Retrieve a list of stock movements with optional filtering.
        Includes product relationship loaded for product_name access.
        """
        query = select(StockMovement).options(joinedload(StockMovement.product))
        
        if product_id:
            query = query.where(StockMovement.product_id == product_id)
        if movement_type:
            query = query.where(StockMovement.movement_type == movement_type)
        if start_date:
            query = query.where(StockMovement.created_at >= start_date)
        if end_date:
            query = query.where(StockMovement.created_at <= end_date)
            
        query = query.order_by(desc(StockMovement.created_at)).offset(skip).limit(limit)
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_product_history(session: AsyncSession, product_id: UUID, limit: int = 50) -> List[StockMovement]:
        """Retrieve recent stock movement history for a specific product."""
        query = select(StockMovement).options(joinedload(StockMovement.product))\
            .where(StockMovement.product_id == product_id)\
            .order_by(desc(StockMovement.created_at))\
            .limit(limit)
            
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def record_movement(session: AsyncSession, movement_in: StockMovementCreate) -> dict:
        """
        Record a stock movement (in, out, adjustment) and auto-update the product's current_stock.
        Returns a dictionary shaped to map correctly to StockMovementHistoryOut schema.
        """
        product = await ProductService.get_by_id(session, movement_in.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
            
        # Determine valid movement quantity
        qty = movement_in.quantity
        if movement_in.movement_type == MovementType.OUT.value and qty > 0:
            qty = -qty # Ensure OUT is negative
        elif movement_in.movement_type == MovementType.IN.value and qty < 0:
            qty = abs(qty) # Ensure IN is positive

        previous_stock = product.current_stock
        new_stock = previous_stock + qty
        
        if new_stock < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Operation not permitted. Stock cannot be negative (Current: {previous_stock}, Attempted change: {qty})"
            )
            
        # Update product stock
        product.current_stock = new_stock
        session.add(product)
        
        # Create movement record
        movement = StockMovement(
            product_id=product.id,
            movement_type=movement_in.movement_type.value,
            quantity=qty,
            reference=movement_in.reference,
            notes=movement_in.notes,
            unit_cost=movement_in.unit_cost,
            created_by=movement_in.created_by
        )
        session.add(movement)
        
        await session.commit()
        await session.refresh(movement)
        await session.refresh(product)
        
        # Construct combined response explicitly
        return {
            "id": movement.id,
            "product_id": movement.product_id,
            "product_name": product.name,
            "movement_type": movement.movement_type,
            "quantity": movement.quantity,
            "previous_stock": previous_stock,
            "new_stock": new_stock,
            "reference": movement.reference,
            "notes": movement.notes,
            "unit_cost": movement.unit_cost,
            "created_by": movement.created_by,
            "created_at": movement.created_at
        }
