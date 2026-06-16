import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useForecast } from '../hooks/useForecast';
import { movementsAPI } from '../services/api';
import { useState } from 'react';
import KPICard from '../components/KPICard';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { ArrowLeft, Package, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading: pLoading, error: pError, fetchProductById } = useProducts();
  const { forecasts, metrics, loading: fLoading, generating, requestGenerateForecast, fetchForecast } = useForecast();
  
  const [movements, setMovements] = useState([]);
  const [mLoading, setMLoading] = useState(false);

  useEffect(() => {
    fetchProductById(id);
    fetchForecast(id);
    fetchMovements(id);
  }, [id, fetchProductById, fetchForecast]);

  const fetchMovements = async (productId) => {
    try {
      setMLoading(true);
      const res = await movementsAPI.getByProductId(productId, { limit: 10 });
      setMovements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMLoading(false);
    }
  };

  if (pLoading && !product) return <div className="p-8 text-secondary">Loading product...</div>;
  if (pError || !product) return <div className="p-8 text-danger">{pError || 'Product not found'}</div>;

  // Chart Data Preparation
  const chartData = {
    labels: forecasts?.map(f => formatDate(f.forecast_date)) || [],
    datasets: [
      {
        label: 'Predicted Demand',
        data: forecasts?.map(f => f.predicted_demand) || [],
        borderColor: '#0abde3',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4
      },
      {
        label: 'Upper Confidence Limit',
        data: forecasts?.map(f => f.upper_bound) || [],
        borderColor: 'rgba(10, 189, 227, 0.2)',
        backgroundColor: 'rgba(10, 189, 227, 0.1)',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: 1, // fill to dataset index 1 (next one down, but lower is below)
        pointRadius: 0
      },
      {
        label: 'Lower Confidence Limit',
        data: forecasts?.map(f => f.lower_bound) || [],
        borderColor: 'rgba(10, 189, 227, 0.2)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#8b8fa3',
    plugins: {
      legend: { labels: { color: '#e2e4e9' } }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8fa3' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8fa3' } }
    }
  };

  const movColumns = [
    { header: 'Date', accessor: 'created_at', cell: r => formatDate(r.created_at, true) },
    { header: 'Type', accessor: 'movement_type', cell: r => <Badge type={r.movement_type} text={r.movement_type} /> },
    { header: 'Qty', accessor: 'quantity', cell: r => <span className={`font-bold ${r.quantity > 0 ? 'text-success' : 'text-danger'}`}>{r.quantity > 0 ? `+${r.quantity}` : r.quantity}</span> },
    { header: 'Stock After', accessor: 'new_stock', cell: r => <span>{r.new_stock}</span> },
    { header: 'Ref', accessor: 'reference' }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate('/products')} 
          className="text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            {product.name}
            <Badge type={product.status} text={product.status.replace('_', ' ')} />
          </h1>
          <p className="text-secondary text-sm font-mono mt-1">{product.sku} | {product.category}</p>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="dashboard__kpis">
        <KPICard 
          title="Current Stock" 
          value={`${formatNumber(product.current_stock)} ${product.unit}`} 
          icon={Package} 
          color={product.current_stock <= product.min_stock ? "danger" : "success"} 
        />
        <KPICard 
          title="Min/Max Stock" 
          value={`${formatNumber(product.min_stock)} - ${formatNumber(product.max_stock || '∞')}`} 
          icon={AlertTriangle} 
          color="warning" 
        />
        <KPICard 
          title="Lead Time" 
          value={`${product.lead_time_days} days`} 
          icon={Clock} 
          color="accent" 
        />
        <KPICard 
          title="Est. 30d Demand" 
          value={metrics ? formatNumber(forecasts.slice(0, 30).reduce((acc, f) => acc + f.predicted_demand, 0)) : "N/A"} 
          icon={TrendingUp} 
          color="info" 
        />
      </div>

      <div className="dashboard__charts-row">
        {/* ML Forecast Pane */}
        <div className="chart-card flex-1">
          <div className="chart-card__header">
            <h3>AI Demand Forecast</h3>
            <button 
              className="btn btn-secondary text-xs"
              onClick={() => requestGenerateForecast(product.id, 30)}
              disabled={generating}
            >
              {generating ? 'Regenerating...' : 'Refresh Algorithm'}
            </button>
          </div>
          <div className="chart-card__body">
            {fLoading ? (
              <div className="flex h-full items-center justify-center text-secondary">Loading Forecast...</div>
            ) : forecasts?.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-secondary bg-tertiary rounded-lg border border-dashed border-[rgba(255,255,255,0.1)] p-6">
                <AlertTriangle size={32} className="mb-2 text-warning opacity-50" />
                <p>Not enough historical data for prediction.</p>
                <p className="text-xs mt-1 opacity-70">Model requires minimum 14 days of history.</p>
              </div>
            )}
          </div>
        </div>

        {/* Info & Reorder pane */}
        <div className="chart-card min-w-[350px]">
          <div className="chart-card__header">
            <h3>Pricing & Operations</h3>
          </div>
          <div className="p-6 flex flex-col gap-6">
             <div className="flex justify-between border-b border-[rgba(255,255,255,0.06)] pb-4">
               <span className="text-secondary">Cost Price</span>
               <span className="font-mono font-bold">{formatCurrency(product.cost_price)}</span>
             </div>
             <div className="flex justify-between border-b border-[rgba(255,255,255,0.06)] pb-4">
               <span className="text-secondary">Sell Price</span>
               <span className="font-mono font-bold text-success">{formatCurrency(product.sell_price)}</span>
             </div>
             <div className="flex justify-between border-b border-[rgba(255,255,255,0.06)] pb-4">
               <span className="text-secondary">Status</span>
               <Badge type={product.status} text={product.status.replace('_', ' ')} />
             </div>
             
             {/* Recommendation Engine Box mocked */}
             <div className="mt-2 bg-accent-muted p-4 rounded-lg border border-[rgba(108,92,231,0.2)]">
                <div className="text-accent font-bold mb-1 flex justify-between">
                  <span>Reorder Optimizer</span>
                  <span className="text-xs bg-accent text-white px-2 rounded-full flex items-center">EOQ</span>
                </div>
                <p className="text-sm text-primary mb-3">Suggested optimal reorder size based on carrying cost and predicted demand.</p>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-primary">{Math.max(0, product.max_stock - product.current_stock)}</span>
                  <span className="text-secondary text-sm">Target Qty</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div className="chart-card">
        <div className="chart-card__header">
          <h3>Recent Stock Movements</h3>
        </div>
        <div>
          <DataTable 
            columns={movColumns} 
            data={movements} 
            isLoading={mLoading}
          />
        </div>
      </div>

    </div>
  );
}
