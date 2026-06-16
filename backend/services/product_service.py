from uuid import UUID
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException, status

from models.db_models import Product
from models.schemas import ProductCreate, ProductUpdate
from models.enums import ProductStatus

class ProductService:
    @staticmethod
    async def get_all(
        session: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        low_stock_only: bool = False
    ) -> List[Product]:
        """
        Retrieve a list of products with optional filtering.
        """
        query = select(Product)
        
        if category:
            query = query.where(Product.category == category)
        if status:
            query = query.where(Product.status == status)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_filter),
                    Product.sku.ilike(search_filter)
                )
            )
            
        if low_stock_only:
            query = query.where(Product.current_stock <= Product.min_stock)
            
        query = query.offset(skip).limit(limit)
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(session: AsyncSession, product_id: UUID) -> Optional[Product]:
        """Retrieve a single product by its UUID."""
        query = select(Product).where(Product.id == product_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()
        
    @staticmethod
    async def get_by_sku(session: AsyncSession, sku: str) -> Optional[Product]:
        """Retrieve a single product by its SKU."""
        query = select(Product).where(Product.sku == sku)
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(session: AsyncSession, product_in: ProductCreate) -> Product:
        """Create a new product."""
        # Check if SKU already exists
        existing = await ProductService.get_by_sku(session, product_in.sku)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{product_in.sku}' already exists."
            )
            
        new_product = Product(**product_in.model_dump())
        session.add(new_product)
        await session.commit()
        await session.refresh(new_product)
        return new_product

    @staticmethod
    async def update(session: AsyncSession, product_id: UUID, product_in: ProductUpdate) -> Product:
        """Update an existing product."""
        product = await ProductService.get_by_id(session, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
            
        update_data = product_in.model_dump(exclude_unset=True)
        
        # Check SKU conflict if SKU is being updated
        if "sku" in update_data and update_data["sku"] != product.sku:
            existing = await ProductService.get_by_sku(session, update_data["sku"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with SKU '{update_data['sku']}' already exists."
                )

        for field, value in update_data.items():
            setattr(product, field, value)
            
        session.add(product)
        await session.commit()
        await session.refresh(product)
        return product

    @staticmethod
    async def soft_delete(session: AsyncSession, product_id: UUID) -> Product:
        """Soft delete a product by setting its status to DISCONTINUED."""
        product = await ProductService.get_by_id(session, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
            
        product.status = ProductStatus.DISCONTINUED.value
        session.add(product)
        await session.commit()
        await session.refresh(product)
        return product
