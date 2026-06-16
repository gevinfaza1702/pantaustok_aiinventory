from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import pandas as pd
from fastapi import HTTPException, status

from models.db_models import Product, StockMovement, ForecastResult
from models.enums import MovementType, ModelUsed
from ml.prophet_model import ProphetModel
from ml.sarima_model import SARIMAModel
from ml.ensemble import EnsembleModel

class ForecastEngine:
    @staticmethod
    async def get_daily_demand_data(session: AsyncSession, product_id: UUID) -> pd.DataFrame:
        """
        Aggregates historical stock movements (OUT type) into daily demand.
        Returns empty DataFrame if no data exists.
        """
        from sqlalchemy import text
        raw_sql = text("""
            SELECT date_trunc('day', created_at) AS ds, SUM(quantity) AS y
            FROM stock_movements
            WHERE product_id = :product_id
              AND movement_type = :movement_type
            GROUP BY date_trunc('day', created_at)
            ORDER BY ds
        """)
        result = await session.execute(raw_sql, {
            "product_id": str(product_id),
            "movement_type": MovementType.OUT.value
        })
        rows = result.all()
        
        if not rows:
            return pd.DataFrame(columns=['ds', 'y'])
            
        df = pd.DataFrame(rows, columns=['ds', 'y'])
        
        # Quantity from out movement is negative, abs it to get demand magnitude
        df['y'] = df['y'].abs()
        
        # Ensure 'ds' is timezone unaware datetime for Prophet
        df['ds'] = pd.to_datetime(df['ds']).dt.tz_localize(None)
        
        # Resample to fill missing days with 0 demand
        df.set_index('ds', inplace=True)
        # Handle duplicate indices just in case
        df = df[~df.index.duplicated(keep='first')]
        df = df.asfreq('D', fill_value=0.0)
        df.reset_index(inplace=True)
        
        return df

    @staticmethod
    async def generate_forecast(session: AsyncSession, product_id: UUID, days: int = 30) -> Dict[str, Any]:
        """
        Generates forecast using Ensemble (Prophet + SARIMA).
        Returns list of forecasted dicts and the model used.
        """
        df = await ForecastEngine.get_daily_demand_data(session, product_id)
        
        if len(df) < 14:
            # Fallback to naive forecast (rolling mean) if not enough data
            if len(df) < 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Not enough historical data to generate forecast even via naive approach (need at least 3 days)."
                )
            
            avg_demand = df['y'].mean()
            std_demand = df['y'].std() if len(df) > 1 else avg_demand * 0.1
            
            last_date = df['ds'].max()
            future_dates = [last_date + timedelta(days=i) for i in range(1, days + 1)]
            
            naive_results = []
            for dt in future_dates:
                naive_results.append({
                    "ds": dt,
                    "yhat": avg_demand,
                    "yhat_lower": max(0, avg_demand - (1.96 * std_demand)),
                    "yhat_upper": avg_demand + (1.96 * std_demand)
                })
                
            return {
                "model_used": ModelUsed.NAIVE,
                "forecast": naive_results
            }

        try:
            # Try Ensemble (Prophet + SARIMA)
            prophet = ProphetModel()
            prophet_forecast = prophet.train_and_predict(df, days_to_predict=days)
            
            sarima = SARIMAModel()
            sarima_forecast = sarima.train_and_predict(df, days_to_predict=days)
            
            ensemble = EnsembleModel(prophet_weight=0.6, sarima_weight=0.4)
            final_forecast = ensemble.combine(prophet_forecast, sarima_forecast)
            
            return {
                "model_used": ModelUsed.ENSEMBLE,
                "forecast": final_forecast.to_dict(orient='records')
            }
        except Exception:
            pass  # Prophet failed, fallback to SARIMA only

        try:
            # Fallback 1: SARIMA only
            sarima = SARIMAModel()
            sarima_forecast = sarima.train_and_predict(df, days_to_predict=days)
            return {
                "model_used": ModelUsed.SARIMA,
                "forecast": sarima_forecast.to_dict(orient='records')
            }
        except Exception:
            pass  # SARIMA failed too, use naive

        # Fallback 2: Naive rolling mean
        avg_demand = df['y'].mean()
        std_demand = df['y'].std() if len(df) > 1 else avg_demand * 0.1
        last_date = df['ds'].max()
        future_dates = [last_date + timedelta(days=i) for i in range(1, days + 1)]
        naive_results = [
            {
                "ds": dt,
                "yhat": avg_demand,
                "yhat_lower": max(0, avg_demand - (1.96 * std_demand)),
                "yhat_upper": avg_demand + (1.96 * std_demand)
            }
            for dt in future_dates
        ]
        return {
            "model_used": ModelUsed.NAIVE,
            "forecast": naive_results
        }

    @staticmethod
    async def save_forecast(session: AsyncSession, product_id: UUID, forecast_data: Dict[str, Any]):
        """
        Deletes old predictions for the product and saves the new ones.
        """
        # Delete old forecasts
        delete_query = select(ForecastResult).where(ForecastResult.product_id == product_id)
        result = await session.execute(delete_query)
        old_results = result.scalars().all()
        for old in old_results:
            await session.delete(old)
            
        # Insert new forecasts
        model_str = forecast_data["model_used"].value
        records = []
        for row in forecast_data["forecast"]:
            f = ForecastResult(
                product_id=product_id,
                forecast_date=row["ds"],
                predicted_demand=round(row["yhat"], 2),
                lower_bound=round(row["yhat_lower"], 2),
                upper_bound=round(row["yhat_upper"], 2),
                model_used=model_str
            )
            records.append(f)
            
        session.add_all(records)
        await session.commit()
