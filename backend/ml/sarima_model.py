import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX
import warnings

# Suppress ConvergenceWarnings from SARIMAX
warnings.filterwarnings("ignore")

class SARIMAModel:
    def __init__(self):
        self.params = {
            "order": (1, 1, 1), # Default fallback (p, d, q)
            "seasonal_order": (1, 0, 1, 7), # Default fallback (P, D, Q, s)
            "enforce_stationarity": False,
            "enforce_invertibility": False
        }

    def train_and_predict(self, df: pd.DataFrame, days_to_predict: int = 30) -> pd.DataFrame:
        """
        Fits SARIMA on df['y'] and predicts 'days_to_predict' into the future.
        Returns a DataFrame with ['ds', 'yhat', 'yhat_lower', 'yhat_upper'].
        """
        # Ensure at least 14 days of data
        if len(df) < 14:
            raise ValueError("Insufficient data for SARIMA model")
        
        # Set date index
        df = df.copy()
        df['ds'] = pd.to_datetime(df['ds'])
        df.set_index('ds', inplace=True)
        # Ensure daily frequency for statsmodels
        df = df.asfreq('D').fillna(0)

        model = SARIMAX(
            df['y'], 
            order=self.params["order"], 
            seasonal_order=self.params["seasonal_order"],
            enforce_stationarity=self.params["enforce_stationarity"],
            enforce_invertibility=self.params["enforce_invertibility"]
        )
        
        results = model.fit(disp=False)
        forecast = results.get_forecast(steps=days_to_predict)
        
        # Extract mean, bounds
        pred_mean = forecast.predicted_mean
        pred_ci = forecast.conf_int(alpha=0.05) # 95% CI
        
        # Build return dataframe
        preds = pd.DataFrame({
            'ds': pred_mean.index,
            'yhat': pred_mean.values,
            'yhat_lower': pred_ci.iloc[:, 0].values,
            'yhat_upper': pred_ci.iloc[:, 1].values
        }).reset_index(drop=True)
        
        # Clip negative predictions
        preds['yhat'] = preds['yhat'].clip(lower=0)
        preds['yhat_lower'] = preds['yhat_lower'].clip(lower=0)
        preds['yhat_upper'] = preds['yhat_upper'].clip(lower=0)
        
        return preds
