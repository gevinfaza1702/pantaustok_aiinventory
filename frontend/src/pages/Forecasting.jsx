import { useEffect, useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useForecast } from '../hooks/useForecast';
import { formatDate } from '../utils/formatters';
import { LineChart, Activity, Cpu, Search, ChevronRight } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import KPICard from '../components/KPICard';
import './Forecasting.css';

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#9aa0b5', boxWidth: 10, padding: 16 } },
    tooltip: {
      backgroundColor: '#1e2230',
      titleColor: '#f0f2f7',
      bodyColor: '#9aa0b5',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6278', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6278', font: { size: 11 } } }
  }
};

export default function Forecasting() {
  const { products, loading: pLoading, fetchProducts } = useProducts();
  const { forecasts, metrics, loading: fLoading, error: fError, generating, fetchForecast, requestGenerateForecast } = useForecast();
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    fetchForecast(product.id);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (product) => {
    if (product.current_stock === 0) return 'out';
    if (product.current_stock <= product.min_stock) return 'critical';
    return 'healthy';
  };

  const chartData = {
    labels: forecasts?.map(f => formatDate(f.forecast_date)) || [],
    datasets: [
      {
        label: 'Predicted Demand',
        data: forecasts?.map(f => f.predicted_demand) || [],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
      {
        label: 'Upper Bound',
        data: forecasts?.map(f => f.upper_bound) || [],
        borderColor: 'rgba(99,102,241,0.25)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Lower Bound',
        data: forecasts?.map(f => f.lower_bound) || [],
        borderColor: 'rgba(99,102,241,0.25)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  return (
    <div className="forecast-layout">

      {/* ── Left: Product Selector ──────────────────── */}
      <aside className="forecast-sidebar">
        <div className="forecast-sidebar__header">
          <h2 className="forecast-sidebar__title">Select Product</h2>
          <div className="forecast-sidebar__search">
            <Search size={14} className="forecast-sidebar__search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="forecast-sidebar__list">
          {pLoading ? (
            <div className="forecast-sidebar__empty">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="forecast-sidebar__empty">No products found.</div>
          ) : (
            filteredProducts.map(p => {
              const status = getStockStatus(p);
              const isActive = selectedProduct?.id === p.id;
              return (
                <button
                  key={p.id}
                  className={`forecast-product-item ${isActive ? 'forecast-product-item--active' : ''}`}
                  onClick={() => handleSelectProduct(p)}
                >
                  <div className="forecast-product-item__body">
                    <div className="forecast-product-item__name">{p.name}</div>
                    <div className="forecast-product-item__meta">
                      <span className="forecast-product-item__sku">{p.sku}</span>
                      <span className={`forecast-product-item__stock forecast-product-item__stock--${status}`}>
                        {p.current_stock} {p.unit}
                      </span>
                    </div>
                  </div>
                  {isActive && <ChevronRight size={14} className="forecast-product-item__arrow" />}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Right: Main Forecast View ──────────────── */}
      <main className="forecast-main">
        {!selectedProduct ? (
          <div className="forecast-empty">
            <LineChart size={52} className="forecast-empty__icon" />
            <h2 className="forecast-empty__title">Demand Forecasting Engine</h2>
            <p className="forecast-empty__desc">
              Select a product from the left to view its AI-generated demand forecast,
              historical accuracy metrics, and confidence envelope.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in forecast-content">

            {/* Product Header */}
            <div className="forecast-header">
              <div>
                <h1 className="forecast-header__title">{selectedProduct.name} — Forecast</h1>
                <p className="forecast-header__sub">Next 30 days · Prophet + SARIMA Ensemble</p>
              </div>
              <button
                onClick={() => requestGenerateForecast(selectedProduct.id, 30)}
                disabled={generating}
                className="btn btn-primary"
              >
                <Activity size={15} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Running Models...' : 'Run New Forecast'}
              </button>
            </div>

            {fError && (
              <div className="forecast-error">
                {fError}
              </div>
            )}

            {/* KPI row */}
            <div className="forecast-kpis">
              <KPICard
                title="Active Model"
                value={forecasts?.[0]?.model_used?.toUpperCase() || 'N/A'}
                icon={Cpu}
                color="accent"
              />
              <KPICard
                title="MAPE Accuracy"
                value={`${metrics?.mape || 0}%`}
                icon={LineChart}
                color="success"
                trend="up"
                trendValue="vs Baseline"
              />
              <KPICard
                title="Predicted Qty (30d)"
                value={Math.round(forecasts?.slice(0, 30).reduce((s, f) => s + f.predicted_demand, 0) || 0)}
                icon={Activity}
                color="info"
              />
            </div>

            {/* Chart */}
            <div className="chart-card forecast-chart">
              <div className="chart-card__header">
                <h3>Demand Projection Envelope</h3>
                {fLoading && <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Loading...</span>}
              </div>
              <div className="chart-card__body" style={{ height: '340px' }}>
                {fLoading ? (
                  <div className="forecast-chart-placeholder">Loading chart data...</div>
                ) : forecasts?.length > 0 ? (
                  <Line data={chartData} options={CHART_OPTIONS} />
                ) : (
                  <div className="forecast-chart-placeholder">
                    No forecast data yet. Click <strong>Run New Forecast</strong> to generate.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

    </div>
  );
}
