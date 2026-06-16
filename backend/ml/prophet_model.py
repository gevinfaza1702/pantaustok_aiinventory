import pandas as pd
from prophet import Prophet
from typing import Tuple

class ProphetModel:
    def __init__(self):
        self.params = {
            "seasonality_mode": "multiplicative",
            "yearly_seasonality": True,
            "weekly_seasonality": True,
            "daily_seasonality": False,
            "changepoint_prior_scale": 0.05,
            "interval_width": 0.95,
        }

    def train_and_predict(self, df: pd.DataFrame, days_to_predict: int = 30) -> pd.DataFrame:
        """
        Fits Prophet on df['ds', 'y'] and predicts 'days_to_predict' into the future.
        Returns a DataFrame with ['ds', 'yhat', 'yhat_lower', 'yhat_upper'].
        """
        # Ensure at least 14 days of data
        if len(df) < 14:
            raise ValueError("Insufficient data for Prophet model (need at least 14 days)")

        model = Prophet(**self.params)
        model.fit(df)
        
        future = model.make_future_dataframe(periods=days_to_predict)
        forecast = model.predict(future)
        
        # Filter only the future predictions
        future_forecast = forecast.tail(days_to_predict)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        
        # Ensure no negative predictions
        future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)
        future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(lower=0)
        future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(lower=0)
        
        return future_forecast
