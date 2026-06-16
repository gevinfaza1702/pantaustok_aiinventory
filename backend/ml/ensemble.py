import pandas as pd

class EnsembleModel:
    def __init__(self, prophet_weight: float = 0.6, sarima_weight: float = 0.4):
        self.prophet_weight = prophet_weight
        self.sarima_weight = sarima_weight
        
    def combine(self, prophet_df: pd.DataFrame, sarima_df: pd.DataFrame) -> pd.DataFrame:
        """
        Combines Prophet and SARIMA predictions using a weighted average.
        Both dataframes must have ['ds', 'yhat', 'yhat_lower', 'yhat_upper']
        and represent the same future timeline.
        """
        # Ensure lengths match
        if len(prophet_df) != len(sarima_df):
            raise ValueError("Forecast lengths do not match between models.")
            
        combined = pd.DataFrame()
        combined['ds'] = prophet_df['ds']
        
        # Weighted avg for point forecast
        combined['yhat'] = (
            prophet_df['yhat'] * self.prophet_weight + 
            sarima_df['yhat'] * self.sarima_weight
        )
        
        # Simplified weighted bounds
        combined['yhat_lower'] = (
            prophet_df['yhat_lower'] * self.prophet_weight + 
            sarima_df['yhat_lower'] * self.sarima_weight
        )
        
        combined['yhat_upper'] = (
            prophet_df['yhat_upper'] * self.prophet_weight + 
            sarima_df['yhat_upper'] * self.sarima_weight
        )
        
        # Clip
        combined['yhat'] = combined['yhat'].clip(lower=0)
        combined['yhat_lower'] = combined['yhat_lower'].clip(lower=0)
        combined['yhat_upper'] = combined['yhat_upper'].clip(lower=0)
        
        return combined
