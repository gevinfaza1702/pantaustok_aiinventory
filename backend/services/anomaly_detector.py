import numpy as pd
import pandas as pd
from typing import List, Dict, Any

class AnomalyDetector:
    @staticmethod
    def detect_anomalies(df: pd.DataFrame, z_threshold: float = 2.5, iqr_multiplier: float = 1.5) -> List[Dict[str, Any]]:
        """
        Accepts dataframe with 'ds' and 'y'.
        Returns a list of dicts describing the anomalies detected using Z-Score AND IQR.
        """
        if len(df) < 7:
            return [] # Need data context
            
        df = df.copy()
        
        # Calculate Z-Score
        mean = df['y'].mean()
        std = df['y'].std()
        
        if std == 0:
            df['z_score'] = 0
        else:
            df['z_score'] = (df['y'] - mean) / std
            
        # Calculate IQR
        Q1 = df['y'].quantile(0.25)
        Q3 = df['y'].quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - (iqr_multiplier * IQR)
        upper_bound = Q3 + (iqr_multiplier * IQR)
        
        # Flags
        df['is_z_anomaly'] = df['z_score'].abs() > z_threshold
        df['is_iqr_anomaly'] = (df['y'] < lower_bound) | (df['y'] > upper_bound)
        
        # Strict definition: BOTH methods must flag it
        df['is_anomaly'] = df['is_z_anomaly'] & df['is_iqr_anomaly']
        
        anomalies = []
        anomaly_rows = df[df['is_anomaly']]
        
        for idx, row in anomaly_rows.iterrows():
            anomalies.append({
                "date": row['ds'],
                "actual_demand": row['y'],
                "expected_mean": mean,
                "z_score": row['z_score']
            })
            
        return anomalies
