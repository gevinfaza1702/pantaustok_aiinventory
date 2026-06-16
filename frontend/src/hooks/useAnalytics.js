import { useState, useCallback, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { extractErrorMessage } from '../utils/formatters';

export function useAnalytics() {
  const [data, setData] = useState({ kpis: {}, charts: {} });
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getDashboard();
      setData(response.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      setInsightsLoading(true);
      const response = await dashboardAPI.getInsights();
      setInsights(response.data?.insights);
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, insights, loading, insightsLoading, error, refetch: fetchData, fetchInsights };
}
