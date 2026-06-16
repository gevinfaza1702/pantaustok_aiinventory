import pandas as pd
from typing import Tuple

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Given a dataframe with columns ['ds', 'y'] (date and demand),
    extract lag features, rolling statistics, and date-based features.
    """
    df = df.copy()
    
    # Ensure ds is datetime
    df['ds'] = pd.to_datetime(df['ds'])
    
    # Date-based features
    df['day_of_week'] = df['ds'].dt.dayofweek
    df['month'] = df['ds'].dt.month
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Lag features
    df['lag_7d'] = df['y'].shift(7)
    df['lag_14d'] = df['y'].shift(14)
    df['lag_30d'] = df['y'].shift(30)
    
    # Rolling stats
    df['rolling_mean_7d'] = df['y'].rolling(window=7).mean()
    df['rolling_std_7d'] = df['y'].rolling(window=7).std()
    
    # Fill NAs
    df.fillna(method='bfill', inplace=True)
    
    return df
