from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.schemas import ProductCreate, ProductUpdate, ProductOut, StockMovementHistoryOut
from services.product_service import ProductService
from services.stock_service import StockService

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductOut])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """List products with optional filtering."""
    return await ProductService.get_all(
        session=db, skip=skip, limit=limit, 
        category=category, status=status, search=search, low_stock_only=low_stock_only
    )

@router.post("", response_model=ProductOut)
async def create_product(product_in: ProductCreate, db: AsyncSession = Depends(get_db)):
    """Create a new product."""
    return await ProductService.create(db, product_in)

@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    """Get single product including stock history and forecast setup."""
    product = await ProductService.get_by_id(db, product_id)
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_in: ProductUpdate, 
    product_id: UUID = Path(...), 
    db: AsyncSession = Depends(get_db)
):
    """Update a product."""
    return await ProductService.update(db, product_id, product_in)

@router.delete("/{product_id}", response_model=ProductOut)
async def soft_delete_product(product_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    """Soft delete a product."""
    return await ProductService.soft_delete(db, product_id)
