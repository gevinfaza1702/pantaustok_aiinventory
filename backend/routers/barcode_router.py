"""
Barcode / QR support.
- Quick product lookup by SKU (for scanner)
- QR-label PNG generation per product
"""

import io
from uuid import UUID

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import Product
from services.auth_service import get_current_user

router = APIRouter(prefix="/products", tags=["Barcode / QR"])


@router.get("/by-sku/{sku}")
async def lookup_by_sku(sku: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    """Quick lookup used by the scanner. Matches the exact SKU."""
    result = await db.execute(select(Product).where(Product.sku == sku))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=f"No product with SKU '{sku}'")
    return {
        "id": str(product.id),
        "sku": product.sku,
        "name": product.name,
        "category": product.category,
        "unit": product.unit,
        "current_stock": product.current_stock,
        "min_stock": product.min_stock,
        "cost_price": float(product.cost_price),
        "sell_price": float(product.sell_price),
        "status": product.status,
    }


@router.get("/{product_id}/qr-label")
async def qr_label(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """Generate a printable QR code PNG encoding the product SKU."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(product.sku)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_{product.sku}.png"'},
    )
