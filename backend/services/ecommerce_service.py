"""
E-Commerce Integration service.

Mock connectors implement a common interface so they can later be swapped
for real Tokopedia / Shopee / WooCommerce SDK clients without touching callers.
A connector can:
  - sync_stock(products)  → push stock levels to the channel
  - pull_orders()         → fetch new orders from the channel
"""

import random
from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.db_models import Product, StockMovement
from models.ecommerce_models import EcommerceChannel, EcommerceOrder

SUPPORTED_PLATFORMS = {"tokopedia", "shopee", "woocommerce"}


# ─── Connector interface + mock implementations ──────────
class BaseConnector:
    platform = "base"

    def __init__(self, channel: EcommerceChannel):
        self.channel = channel

    def sync_stock(self, products: List[Product]) -> int:
        raise NotImplementedError

    def pull_orders(self, products: List[Product]) -> List[Dict[str, Any]]:
        raise NotImplementedError


class MockConnector(BaseConnector):
    """Simulates a marketplace: 'pushes' stock and invents a few new orders."""

    def sync_stock(self, products: List[Product]) -> int:
        # In a real connector this would call the platform API per SKU.
        return len(products)

    def pull_orders(self, products: List[Product]) -> List[Dict[str, Any]]:
        if not products:
            return []
        n = random.randint(0, 3)
        orders = []
        for _ in range(n):
            p = random.choice(products)
            orders.append({
                "external_order_id": f"{self.platform[:3].upper()}-{random.randint(100000, 999999)}",
                "product_id": p.id,
                "quantity": random.randint(1, 3),
            })
        return orders


def _connector_for(channel: EcommerceChannel) -> BaseConnector:
    conn = MockConnector(channel)
    conn.platform = channel.platform
    return conn


# ─── Channel CRUD ────────────────────────────────────────
async def list_channels(session: AsyncSession) -> List[Dict[str, Any]]:
    result = await session.execute(select(EcommerceChannel).order_by(EcommerceChannel.created_at))
    out = []
    for c in result.scalars().all():
        order_count = await session.execute(
            select(EcommerceOrder).where(EcommerceOrder.channel_id == c.id)
        )
        out.append({
            "id": str(c.id),
            "platform": c.platform,
            "store_name": c.store_name,
            "is_active": c.is_active,
            "last_sync": c.last_sync.isoformat() if c.last_sync else None,
            "order_count": len(order_count.scalars().all()),
        })
    return out


async def create_channel(session: AsyncSession, platform: str, store_name: str, api_key: str = "") -> EcommerceChannel:
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    channel = EcommerceChannel(platform=platform, store_name=store_name, api_key=api_key)
    session.add(channel)
    await session.commit()
    await session.refresh(channel)
    return channel


# ─── Sync ────────────────────────────────────────────────
async def sync_channel(session: AsyncSession, channel_id: UUID) -> Dict[str, Any]:
    channel = await session.get(EcommerceChannel, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    products = list((await session.execute(
        select(Product).where(Product.status == "active")
    )).scalars().all())

    connector = _connector_for(channel)
    synced = connector.sync_stock(products)
    new_orders = connector.pull_orders(products)

    created = 0
    for o in new_orders:
        product = next((p for p in products if p.id == o["product_id"]), None)
        order = EcommerceOrder(
            channel_id=channel.id,
            external_order_id=o["external_order_id"],
            product_id=o["product_id"],
            quantity=o["quantity"],
            status="processed",
        )
        session.add(order)
        # Auto-deduct stock for the pulled order
        if product:
            product.current_stock = max(0, (product.current_stock or 0) - o["quantity"])
            session.add(StockMovement(
                product_id=product.id,
                movement_type="out",
                quantity=o["quantity"],
                reference=o["external_order_id"],
                notes=f"Order dari {channel.platform}",
                created_by="ecommerce",
            ))
        created += 1

    channel.last_sync = datetime.utcnow()
    await session.commit()
    return {
        "channel_id": str(channel.id),
        "stock_synced": synced,
        "orders_pulled": created,
        "last_sync": channel.last_sync.isoformat(),
    }


async def list_orders(session: AsyncSession) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(EcommerceOrder)
        .order_by(EcommerceOrder.synced_at.desc())
        .options(selectinload(EcommerceOrder.product), selectinload(EcommerceOrder.channel))
        .limit(100)
    )
    return [
        {
            "id": str(o.id),
            "external_order_id": o.external_order_id,
            "platform": o.channel.platform if o.channel else "",
            "product_name": o.product.name if o.product else "—",
            "quantity": o.quantity,
            "status": o.status,
            "synced_at": o.synced_at.isoformat() if o.synced_at else None,
        }
        for o in result.scalars().all()
    ]
