import { useEffect, useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import KPICard from '../components/KPICard';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { 
  Package, AlertTriangle, AlertOctagon, 
  DollarSign, Activity, BarChart2, Sparkles, Loader2, Play
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const GRID_COLOR = 'rgba(255,255,255,0.04)';
const TICK_COLOR = '#5c6278';
const LEGEND_COLOR = '#9aa0b5';

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: LEGEND_COLOR, boxWidth: 10, padding: 16 } },
    tooltip: {
      backgroundColor: '#1e2230',
      titleColor: '#f0f2f7',
      bodyColor: '#9aa0b5',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    }
  },
  scales: {
    x: {
      grid: { color: GRID_COLOR },
      ticks: { color: TICK_COLOR, font: { size: 11 } }
    },
    y: {
      grid: { color: GRID_COLOR },
      ticks: { color: TICK_COLOR, font: { size: 11 } }
    }
  }
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { color: LEGEND_COLOR, boxWidth: 12, padding: 18 } },
    tooltip: {
      backgroundColor: '#1e2230',
      titleColor: '#f0f2f7',
      bodyColor: '#9aa0b5',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    }
  },
  cutout: '68%'
};

export default function Dashboard() {
  const { data, insights, loading, insightsLoading, error, refetch, fetchInsights } = useAnalytics();
  const [aiLang, setAiLang] = useState('id');

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading || !data) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading analytics engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-loading">
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    );
  }

  const { kpis, charts } = data;

  const demandTrendData = {
    labels: charts.demand_trend_30d.labels.map(l => l.substring(5)),
    datasets: [{
      label: 'Demand Outflow',
      data: charts.demand_trend_30d.actual,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      borderWidth: 2,
    }]
  };

  const distColors = ['#22c55e', '#f59e0b', '#ef4444', '#374151'];
  const stockDistData = {
    labels: charts.stock_distribution.labels,
    datasets: [{
      data: charts.stock_distribution.data,
      backgroundColor: distColors,
      borderColor: 'transparent',
      borderWidth: 0,
      hoverOffset: 6,
    }]
  };

  const catColors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];
  const categoryData = {
    labels: charts.category_breakdown.labels,
    datasets: [{
      label: 'Products',
      data: charts.category_breakdown.data,
      backgroundColor: catColors,
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  return (
    <div className="dashboard">

      {/* KPI Cards */}
      <section className="dashboard__kpis">
        <KPICard title="Total Products"      value={formatNumber(kpis.total_products)}       icon={Package}      color="accent"   />
        <KPICard title="Low Stock Alerts"    value={kpis.low_stock_count}                    icon={AlertTriangle} color="warning"  trend="down" trendValue="12%" />
        <KPICard title="Out of Stock"        value={kpis.out_of_stock_count}                 icon={AlertOctagon}  color="danger"   />
        <KPICard title="Inventory Value"     value={formatCurrency(kpis.total_inventory_value)} icon={DollarSign} color="success"  />
        <KPICard title="Turnover Rate"       value={`${kpis.avg_turnover_rate}x`}            icon={Activity}     color="info"     trend="up"  trendValue="1.2x" />
        <KPICard title="Forecast Accuracy"   value={`${kpis.forecast_accuracy_mape}%`}       icon={BarChart2}    color="accent"   />
      </section>

      {/* AI Insights */}
      <div className="ai-card">
        <div className="ai-card__header">
          <div className="ai-card__icon"><Sparkles size={18} /></div>
          <h2 className="ai-card__title">AI — Inventory Narratives</h2>
          {/* Language selector */}
          <div className="ai-lang-toggle">
            <button
              className={`ai-lang-btn ${aiLang === 'id' ? 'ai-lang-btn--active' : ''}`}
              onClick={() => setAiLang('id')}
            >ID</button>
            <button
              className={`ai-lang-btn ${aiLang === 'en' ? 'ai-lang-btn--active' : ''}`}
              onClick={() => setAiLang('en')}
            >EN</button>
          </div>
        </div>
        <div className="ai-card__body">
          {insightsLoading ? (
            <div className="ai-card__loading">
              <Loader2 size={18} className="animate-spin" />
              AI is analyzing dashboard metrics...
            </div>
          ) : insights ? (
            <div className="ai-card__insights">{insights}</div>
          ) : (
            <>
              <p className="ai-card__intro">
                Generate strategic inventory insights from your real-time KPIs.
                The analysis covers stock health, demand signals, and actionable recommendations.
              </p>
              <button onClick={() => fetchInsights(aiLang)} className="btn btn-primary">
                <Play size={14} /> Generate AI Intelligence
              </button>
            </>
          )}
        </div>
      </div>

      {/* Charts */}
      <section className="dashboard__charts">
        <div className="chart-card chart-card--large">
          <div className="chart-card__header">
            <h3>Global Demand Trend — 30 Days</h3>
            <span>Aggregated Outflows</span>
          </div>
          <div className="chart-card__body">
            <Line data={demandTrendData} options={commonOptions} />
          </div>
        </div>

        <div className="dashboard__charts-row">
          <div className="chart-card">
            <div className="chart-card__header">
              <h3>Stock Health Distribution</h3>
            </div>
            <div className="chart-card__body">
              <Doughnut data={stockDistData} options={doughnutOptions} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <h3>Products by Category</h3>
            </div>
            <div className="chart-card__body">
              <Bar
                data={categoryData}
                options={{
                  ...commonOptions,
                  plugins: { 
                    ...commonOptions.plugins,
                    legend: { display: false }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
