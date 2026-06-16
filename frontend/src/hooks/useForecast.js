import { useState, useCallback } from 'react';
import { forecastAPI } from '../services/api';
import { extractErrorMessage } from '../utils/formatters';

export function useForecast() {
  const [forecasts, setForecasts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchForecast = useCallback(async (productId) => {
    try {
      setLoading(true);
      setError(null);
      const [fRes, aRes] = await Promise.all([
        forecastAPI.getForecast(productId),
        forecastAPI.getAccuracy(productId)
      ]);
      setForecasts(fRes.data);
      setMetrics(aRes.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const requestGenerateForecast = async (productId, days) => {
    try {
      setGenerating(true);
      setError(null);
      await forecastAPI.generateForecast(productId, days);
      // Reload on finish
      await fetchForecast(productId);
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setGenerating(false);
    }
  };

  return {
    forecasts,
    metrics,
    loading,
    generating,
    error,
    fetchForecast,
    requestGenerateForecast
  };
}
