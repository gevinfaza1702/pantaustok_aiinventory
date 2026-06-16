"""
Analytics Extension Service
Provides ABC Analysis, Dead Stock Detection, and Supplier Performance metrics.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from models.db_models import Product, StockMovement, Supplier


# ─── ABC Analysis ──────────────────────────────────────────────────────────────

async def get_abc_analysis(session: AsyncSession) -> Dict[str, Any]:
    """
    Pareto (ABC) analysis on inventory value.
      A = top 70% of cumulative value
      B = next 20%
      C = remaining 10%
    """
    result = await session.execute(
        select(
            Product.id,
            Product.sku,
            Product.name,
            Product.category,
            Product.current_stock,
            Product.cost_price,
        ).where(Product.status == "active")
    )
    rows = result.all()

    # Calculate value per product
    items = [
        {
            "product_id": str(r.id),
            "sku": r.sku,
            "name": r.name,
            "category": r.category,
            "current_stock": r.current_stock,
            "cost_price": float(r.cost_price),
            "value": r.current_stock * float(r.cost_price),
        }
        for r in rows
    ]

    total_value = sum(i["value"] for i in items)
    if total_value == 0:
        return {"items": [], "summary": {"A": 0, "B": 0, "C": 0}, "total_value": 0}

    # Sort descending by value
    items.sort(key=lambda x: x["value"], reverse=True)

    cumulative = 0.0
    summary = {"A": 0, "B": 0, "C": 0}

    for item in items:
        cumulative += item["value"] / total_value
        if cumulative <= 0.70:
            item["class"] = "A"
        elif cumulative <= 0.90:
            item["class"] = "B"
        else:
            item["class"] = "C"
        summary[item["class"]] += 1

    return {
        "items": items,
        "summary": summary,
        "total_value": round(total_value, 2),
    }


# ─── Dead Stock Detection ────────────────────────────────────────────────────

async def get_dead_stock(session: AsyncSession, days_threshold: int = 30) -> List[Dict[str, Any]]:
    """
    Products with current_stock > 0 and no OUT movements in the last N days.
    """
    cutoff = datetime.utcnow() - timedelta(days=days_threshold)

    # Product IDs that HAD movement in the window
    active_sql = text("""
        SELECT DISTINCT product_id
        FROM stock_movements
        WHERE movement_type = 'out'
          AND created_at >= :cutoff
    """)
    active_result = await session.execute(active_sql, {"cutoff": cutoff})
    active_ids = {str(r[0]) for r in active_result.all()}

    # All active products with stock > 0
    products_result = await session.execute(
        select(Product).where(Product.status == "active", Product.current_stock > 0)
    )
    products = products_result.scalars().all()

    dead = []
    for p in products:
        if str(p.id) not in active_ids:
            dead_value = p.current_stock * float(p.cost_price)
            dead.append({
                "product_id": str(p.id),
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "current_stock": p.current_stock,
                "unit": p.unit,
                "cost_price": float(p.cost_price),
                "dead_value": round(dead_value, 2),
                "days_no_movement": days_threshold,
                "recommendation": "Consider discount or return to supplier",
            })

    dead.sort(key=lambda x: x["dead_value"], reverse=True)
    return dead


# ─── Supplier Performance ────────────────────────────────────────────────────

async def get_supplier_performance(session: AsyncSession) -> List[Dict[str, Any]]:
    """
    Aggregate per-supplier metrics: product count, total value, avg reliability.
    """
    suppliers_result = await session.execute(
        select(Supplier).where(Supplier.status == "active")
    )
    suppliers = suppliers_result.scalars().all()

    performance = []
    for s in suppliers:
        # Products supplied
        products_result = await session.execute(
            select(Product).where(Product.supplier_id == s.id, Product.status == "active")
        )
        products = products_result.scalars().all()

        total_value = sum(p.current_stock * float(p.cost_price) for p in products)
        low_stock_count = sum(1 for p in products if 0 < p.current_stock <= p.min_stock)
        out_of_stock = sum(1 for p in products if p.current_stock == 0)

        # IN movements for last 90 days as proxy for delivery activity
        movement_sql = text("""
            SELECT COUNT(*) as deliveries, COALESCE(SUM(quantity), 0) as total_qty
            FROM stock_movements
            WHERE product_id IN :product_ids
              AND movement_type = 'in'
              AND created_at >= NOW() - INTERVAL '90 days'
        """)
        product_ids = tuple(str(p.id) for p in products) or ("00000000-0000-0000-0000-000000000000",)
        mv_result = await session.execute(movement_sql, {"product_ids": product_ids})
        mv_row = mv_result.fetchone()

        performance.append({
            "supplier_id": str(s.id),
            "name": s.name,
            "email": s.email,
            "phone": s.phone,
            "reliability_score": float(s.reliability_score),
            "reliability_pct": round(float(s.reliability_score) * 100, 1),
            "product_count": len(products),
            "total_supplied_value": round(total_value, 2),
            "low_stock_products": low_stock_count,
            "out_of_stock_products": out_of_stock,
            "deliveries_90d": int(mv_row[0]) if mv_row else 0,
            "total_qty_90d": int(mv_row[1]) if mv_row else 0,
            "performance_tier": (
                "Excellent" if float(s.reliability_score) >= 0.90 else
                "Good" if float(s.reliability_score) >= 0.75 else
                "Fair" if float(s.reliability_score) >= 0.60 else "Poor"
            ),
        })

    performance.sort(key=lambda x: x["reliability_score"], reverse=True)
    return performance
