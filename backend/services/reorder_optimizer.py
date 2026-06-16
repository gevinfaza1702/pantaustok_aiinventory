import math
import pandas as pd
from typing import Dict, Any

class ReorderOptimizer:
    @staticmethod
    def calculate_metrics(
        daily_demand_df: pd.DataFrame, 
        lead_time_days: int,
        holding_cost_percentage: float = 0.20,
        ordering_cost: float = 50.0,
        unit_cost: float = 10.0,
        service_level_z: float = 1.65 # 95% service level
    ) -> Dict[str, Any]:
        """
        Calculates EOQ, Safety Stock, and Reorder Point based on historical daily demand.
        """
        if len(daily_demand_df) < 14:
            return {
                "eoq": 0,
                "safety_stock": 0,
                "reorder_point": 0,
                "avg_daily_demand": 0
            }
            
        # 1. Analyze demand
        avg_daily_demand = daily_demand_df['y'].mean()
        std_daily_demand = daily_demand_df['y'].std()
        
        annual_demand = avg_daily_demand * 365
        holding_cost_per_unit = unit_cost * holding_cost_percentage
        
        # 2. EOQ Calculation
        # sqrt((2 * annual_demand * ordering_cost) / holding_cost_per_unit)
        if holding_cost_per_unit > 0:
            eoq = math.sqrt((2 * annual_demand * ordering_cost) / holding_cost_per_unit)
        else:
            eoq = annual_demand / 12 # Fallback
            
        # 3. Safety Stock
        # z_service_level * std_daily_demand * sqrt(lead_time_days)
        safety_stock = service_level_z * std_daily_demand * math.sqrt(lead_time_days)
        
        # 4. Reorder Point
        # (avg_daily_demand * lead_time_days) + safety_stock
        reorder_point = (avg_daily_demand * lead_time_days) + safety_stock
        
        return {
            "eoq": int(round(eoq)),
            "safety_stock": int(round(safety_stock)),
            "reorder_point": int(round(reorder_point)),
            "avg_daily_demand": round(avg_daily_demand, 2)
        }
