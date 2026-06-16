from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from typing import Dict, Any

from models.db_models import Product, StockMovement, ActiveAlert
from models.enums import MovementType

class AnalyticsService:
    @staticmethod
    async def get_dashboard_kpis(session: AsyncSession) -> Dict[str, Any]:
        """
        Calculate top-level KPIs for the dashboard.
        """
        # 1. Product stats
        products_query = select(Product)
        result = await session.execute(products_query)
        products = result.scalars().all()
        
        total_products = len(products)
        low_stock_count = sum(1 for p in products if p.current_stock > 0 and p.current_stock <= p.min_stock)
        out_of_stock_count = sum(1 for p in products if p.current_stock == 0)
        
        total_inventory_value = sum(p.current_stock * p.cost_price for p in products)
        
        # 2. COGS (Cost of Goods Sold over last 30 days vs Avg Inventory)
        # For simplicity in this demo, turnover rate calculation: 
        # (Total Cost of OUT movements) / (Average Inventory Value)
        # Getting total OUT movements cost
        out_query = select(func.sum(StockMovement.quantity * StockMovement.unit_cost)).where(
            StockMovement.movement_type == MovementType.OUT.value
        )
        out_res = await session.execute(out_query)
        total_cogs = abs(out_res.scalar() or 0) # Quantity is negative, so abs()
        
        avg_turnover_rate = 0
        if total_inventory_value > 0:
            avg_turnover_rate = round((total_cogs / total_inventory_value), 2)
            
        # 3. Pending alerts
        alerts_query = select(func.count(ActiveAlert.id)).where(ActiveAlert.is_read == False)
        alert_res = await session.execute(alerts_query)
        pending_alerts = alert_res.scalar() or 0
        
        # Format response
        return {
            "total_products": total_products,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "total_inventory_value": float(total_inventory_value),
            "avg_turnover_rate": float(avg_turnover_rate),
            "pending_alerts": pending_alerts,
            "forecast_accuracy_mape": 12.5 # Mock, but should be calculated from historical residuals
        }

    @staticmethod
    async def get_dashboard_charts(session: AsyncSession) -> Dict[str, Any]:
        """
        Aggregates data for the 3 main dashboard charts + top movers list.
        """
        # --- Stock Distribution
        # Fetch all products and aggregate in memory to avoid PostgreSQL group by alias issues
        prod_query = select(Product.id, Product.current_stock, Product.min_stock)
        prod_res = await session.execute(prod_query)
        prods = prod_res.all()
        
        status_counts = {"Out": 0, "Critical": 0, "Low": 0, "Healthy": 0}
        for p in prods:
            if p.current_stock == 0:
                status_counts["Out"] += 1
            elif p.current_stock <= p.min_stock:
                status_counts["Critical"] += 1
            elif p.current_stock <= p.min_stock * 2:
                status_counts["Low"] += 1
            else:
                status_counts["Healthy"] += 1
                
        stock_dist = {"labels": [], "data": []}
        for status, count in status_counts.items():
            if count > 0:
                stock_dist["labels"].append(status)
                stock_dist["data"].append(count)
            
            
        # --- Category Breakdown
        cat_query = select(Product.category, func.count(Product.id)).group_by(Product.category)
        cat_res = await session.execute(cat_query)
        cat_rows = cat_res.all()
        
        category_breakdown = {"labels": [], "data": []}
        for row in cat_rows:
            category_breakdown["labels"].append(row[0])
            category_breakdown["data"].append(row[1])
            
        # --- Demand Trend 30d (Global simple aggregation)
        trend_query = select(
            func.date_trunc('day', StockMovement.created_at).label('ds'),
            func.sum(StockMovement.quantity).label('y')
        ).where(
            StockMovement.movement_type == MovementType.OUT.value
        ).group_by('ds').order_by('ds').limit(30)
        
        trend_res = await session.execute(trend_query)
        trend_rows = trend_res.all()
        
        demand_trend = {"labels": [], "actual": []}
        for row in trend_rows:
            demand_trend["labels"].append(str(row.ds.date()))
            demand_trend["actual"].append(abs(row.y))
            
        # --- Top Movers (Highest out-flow)
        top_query = select(
            Product.name,
            func.sum(StockMovement.quantity).label('total_out')
        ).join(StockMovement).where(
            StockMovement.movement_type == MovementType.OUT.value
        ).group_by(Product.name).order_by(func.sum(StockMovement.quantity).asc()).limit(5) # .asc() because out is negative
        
        top_res = await session.execute(top_query)
        top_rows = top_res.all()
        
        top_movers = []
        for row in top_rows:
            top_movers.append({
                "name": row[0],
                "movement": abs(row[1]),
                "trend": "up" # Simplified mock
            })
            
        return {
            "stock_distribution": stock_dist,
            "category_breakdown": category_breakdown,
            "demand_trend_30d": demand_trend,
            "top_movers": top_movers
        }
