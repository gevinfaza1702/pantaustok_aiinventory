"""
Profit & Loss Analytics Service.

Revenue and COGS are derived from outbound stock movements ('out'):
  revenue = qty * product.sell_price
  cogs    = qty * (movement.unit_cost or product.cost_price)
  profit  = revenue - cogs
"""

from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.db_models import Product, StockMovement


async def _load_sales(session: AsyncSession, since: datetime = None):
    """Return outbound movements joined with their product."""
    query = (
        select(StockMovement)
        .where(StockMovement.movement_type == "out")
        .options(selectinload(StockMovement.product))
    )
    if since:
        query = query.where(StockMovement.created_at >= since)
    result = await session.execute(query)
    return list(result.scalars().all())


def _line_economics(m: StockMovement) -> Dict[str, float]:
    p = m.product
    qty = abs(m.quantity or 0)
    sell = float(p.sell_price) if p and p.sell_price else 0.0
    cost = float(m.unit_cost) if m.unit_cost else (float(p.cost_price) if p and p.cost_price else 0.0)
    revenue = qty * sell
    cogs = qty * cost
    return {"qty": qty, "revenue": revenue, "cogs": cogs, "profit": revenue - cogs}


async def get_profit_overview(session: AsyncSession) -> Dict[str, Any]:
    sales = await _load_sales(session)
    revenue = cogs = 0.0
    for m in sales:
        e = _line_economics(m)
        revenue += e["revenue"]
        cogs += e["cogs"]
    gross = revenue - cogs
    margin = (gross / revenue * 100) if revenue > 0 else 0.0
    return {
        "total_revenue": round(revenue, 2),
        "total_cogs": round(cogs, 2),
        "gross_profit": round(gross, 2),
        "gross_margin_pct": round(margin, 2),
        "transaction_count": len(sales),
    }


async def get_profit_by_product(session: AsyncSession) -> List[Dict[str, Any]]:
    sales = await _load_sales(session)
    agg = defaultdict(lambda: {"revenue": 0.0, "cogs": 0.0, "qty": 0, "name": "", "sku": ""})
    for m in sales:
        if not m.product:
            continue
        e = _line_economics(m)
        key = str(m.product_id)
        agg[key]["revenue"] += e["revenue"]
        agg[key]["cogs"] += e["cogs"]
        agg[key]["qty"] += e["qty"]
        agg[key]["name"] = m.product.name
        agg[key]["sku"] = m.product.sku

    rows = []
    for pid, v in agg.items():
        profit = v["revenue"] - v["cogs"]
        margin = (profit / v["revenue"] * 100) if v["revenue"] > 0 else 0.0
        rows.append({
            "product_id": pid,
            "product_name": v["name"],
            "sku": v["sku"],
            "units_sold": v["qty"],
            "revenue": round(v["revenue"], 2),
            "cogs": round(v["cogs"], 2),
            "profit": round(profit, 2),
            "margin_pct": round(margin, 2),
        })
    rows.sort(key=lambda r: r["profit"], reverse=True)
    return rows


async def get_profit_by_category(session: AsyncSession) -> List[Dict[str, Any]]:
    sales = await _load_sales(session)
    agg = defaultdict(lambda: {"revenue": 0.0, "cogs": 0.0})
    for m in sales:
        if not m.product:
            continue
        e = _line_economics(m)
        cat = m.product.category or "Uncategorized"
        agg[cat]["revenue"] += e["revenue"]
        agg[cat]["cogs"] += e["cogs"]

    rows = []
    for cat, v in agg.items():
        profit = v["revenue"] - v["cogs"]
        margin = (profit / v["revenue"] * 100) if v["revenue"] > 0 else 0.0
        rows.append({
            "category": cat,
            "revenue": round(v["revenue"], 2),
            "cogs": round(v["cogs"], 2),
            "profit": round(profit, 2),
            "margin_pct": round(margin, 2),
        })
    rows.sort(key=lambda r: r["profit"], reverse=True)
    return rows


async def get_profit_trend(session: AsyncSession, period: str = "daily") -> Dict[str, Any]:
    """Time series of revenue vs COGS. period: daily | weekly | monthly."""
    window_days = {"daily": 30, "weekly": 84, "monthly": 365}.get(period, 30)
    since = datetime.utcnow() - timedelta(days=window_days)
    sales = await _load_sales(session, since=since)

    def bucket(dt: datetime) -> str:
        if period == "monthly":
            return dt.strftime("%Y-%m")
        if period == "weekly":
            return f"{dt.strftime('%Y')}-W{dt.isocalendar()[1]:02d}"
        return dt.strftime("%Y-%m-%d")

    agg = defaultdict(lambda: {"revenue": 0.0, "cogs": 0.0})
    for m in sales:
        e = _line_economics(m)
        b = bucket(m.created_at)
        agg[b]["revenue"] += e["revenue"]
        agg[b]["cogs"] += e["cogs"]

    labels = sorted(agg.keys())
    return {
        "period": period,
        "labels": labels,
        "revenue": [round(agg[l]["revenue"], 2) for l in labels],
        "cogs": [round(agg[l]["cogs"], 2) for l in labels],
        "profit": [round(agg[l]["revenue"] - agg[l]["cogs"], 2) for l in labels],
    }


async def get_profit_heatmap(session: AsyncSession) -> Dict[str, Any]:
    """Profit matrix: rows = category, cols = supplier."""
    sales = await _load_sales(session)
    # Need supplier name — load products with suppliers
    prod_ids = {str(m.product_id) for m in sales if m.product}
    supplier_map: Dict[str, str] = {}
    if prod_ids:
        presult = await session.execute(
            select(Product).options(selectinload(Product.supplier))
        )
        for p in presult.scalars().all():
            supplier_map[str(p.id)] = p.supplier.name if p.supplier else "Unassigned"

    categories: set = set()
    suppliers: set = set()
    matrix: Dict[tuple, float] = defaultdict(float)

    for m in sales:
        if not m.product:
            continue
        e = _line_economics(m)
        cat = m.product.category or "Uncategorized"
        sup = supplier_map.get(str(m.product_id), "Unassigned")
        categories.add(cat)
        suppliers.add(sup)
        matrix[(cat, sup)] += e["profit"]

    cat_list = sorted(categories)
    sup_list = sorted(suppliers)
    grid = [
        [round(matrix.get((cat, sup), 0.0), 2) for sup in sup_list]
        for cat in cat_list
    ]
    return {"categories": cat_list, "suppliers": sup_list, "matrix": grid}
