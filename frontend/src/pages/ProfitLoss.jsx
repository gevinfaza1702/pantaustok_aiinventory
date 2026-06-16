import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { TrendingUp, DollarSign, Coins, Percent, RefreshCw } from 'lucide-react';
import { pnlAPI } from '../services/api';
import { useI18n } from '../i18n/i18n';
import { formatCurrency } from '../utils/formatters';
import KPICard from '../components/KPICard';
import './ProfitLoss.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const TICK = '#5c6278';
const GRID = 'rgba(255,255,255,0.04)';
const LEGEND = '#9aa0b5';

const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: LEGEND, boxWidth: 10, padding: 14 } },
    tooltip: {
      backgroundColor: '#1e2230', titleColor: '#f0f2f7', bodyColor: '#9aa0b5',
      borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12, cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 11 } } },
    y: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 11 } } },
  },
};

function heatColor(value, max) {
  if (max <= 0) return 'transparent';
  const ratio = Math.max(0, Math.min(1, value / max));
  // green intensity scaled by profit
  return `rgba(34,197,94,${0.08 + ratio * 0.5})`;
}

export default function ProfitLoss() {
  const { t } = useI18n();
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byProduct, setByProduct] = useState([]);
  const [trend, setTrend] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);

  const fetchAll = async (p = period) => {
    setLoading(true);
    try {
      const [ov, cat, prod, tr, hm] = await Promise.all([
        pnlAPI.getOverview(),
        pnlAPI.getByCategory(),
        pnlAPI.getByProduct(),
        pnlAPI.getTrend(p),
        pnlAPI.getHeatmap(),
      ]);
      setOverview(ov.data);
      setByCategory(cat.data);
      setByProduct(prod.data);
      setTrend(tr.data);
      setHeatmap(hm.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, []);

  const changePeriod = async (p) => {
    setPeriod(p);
    const tr = await pnlAPI.getTrend(p);
    setTrend(tr.data);
  };

  if (loading || !overview) {
    return (
      <div className="page-container">
        <div className="pnl-loading"><div className="spinner" /><span>{t('common.loading')}</span></div>
      </div>
    );
  }

  const trendData = trend && {
    labels: trend.labels,
    datasets: [
      { label: t('pnl.revenue'), data: trend.revenue, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)', fill: true, tension: 0.35 },
      { label: t('pnl.cogs'), data: trend.cogs, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.10)', fill: true, tension: 0.35 },
    ],
  };

  const catData = {
    labels: byCategory.map(c => c.category),
    datasets: [{
      label: t('pnl.grossProfit'),
      data: byCategory.map(c => c.profit),
      backgroundColor: '#22c55e',
      borderRadius: 6,
    }],
  };

  const topProducts = byProduct.slice(0, 8);
  const flatMax = heatmap ? Math.max(0, ...heatmap.matrix.flat()) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="pnl-heading">
          <TrendingUp size={22} className="pnl-heading__icon" />
          <h1>{t('pnl.title')}</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => fetchAll()}>
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>

      {/* KPI cards */}
      <div className="pnl-kpis">
        <KPICard title={t('pnl.revenue')} value={formatCurrency(overview.total_revenue)} icon={DollarSign} color="accent" />
        <KPICard title={t('pnl.cogs')} value={formatCurrency(overview.total_cogs)} icon={Coins} color="warning" />
        <KPICard title={t('pnl.grossProfit')} value={formatCurrency(overview.gross_profit)} icon={TrendingUp} color="success" />
        <KPICard title={t('pnl.margin')} value={`${overview.gross_margin_pct}%`} icon={Percent} color="info" />
      </div>

      {/* Trend */}
      <div className="pnl-card">
        <div className="pnl-card__header">
          <h2>{t('pnl.trend')}</h2>
          <div className="pnl-period">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button
                key={p}
                className={`pnl-period__btn ${period === p ? 'pnl-period__btn--active' : ''}`}
                onClick={() => changePeriod(p)}
              >{p}</button>
            ))}
          </div>
        </div>
        <div className="pnl-chart">{trendData && <Line data={trendData} options={baseOpts} />}</div>
      </div>

      <div className="pnl-grid-2">
        {/* By category */}
        <div className="pnl-card">
          <div className="pnl-card__header"><h2>{t('pnl.byCategory')}</h2></div>
          <div className="pnl-chart">
            <Bar data={catData} options={{ ...baseOpts, indexAxis: 'y', plugins: { ...baseOpts.plugins, legend: { display: false } } }} />
          </div>
        </div>

        {/* Top products */}
        <div className="pnl-card">
          <div className="pnl-card__header"><h2>{t('pnl.topProducts')}</h2></div>
          <div className="pnl-table-wrap">
            <table className="pnl-table">
              <thead>
                <tr><th>Produk</th><th>Unit</th><th>{t('pnl.grossProfit')}</th><th>{t('pnl.margin')}</th></tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr><td colSpan={4} className="pnl-empty">{t('common.none')}</td></tr>
                ) : topProducts.map(p => (
                  <tr key={p.product_id}>
                    <td className="font-medium">{p.product_name}</td>
                    <td>{p.units_sold}</td>
                    <td className={p.profit >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(p.profit)}</td>
                    <td>{p.margin_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      {heatmap && heatmap.categories.length > 0 && (
        <div className="pnl-card">
          <div className="pnl-card__header"><h2>{t('pnl.heatmap')}</h2></div>
          <div className="pnl-heatmap-wrap">
            <table className="pnl-heatmap">
              <thead>
                <tr>
                  <th></th>
                  {heatmap.suppliers.map(s => <th key={s}>{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmap.categories.map((cat, ri) => (
                  <tr key={cat}>
                    <td className="pnl-heatmap__rowlabel">{cat}</td>
                    {heatmap.matrix[ri].map((val, ci) => (
                      <td
                        key={ci}
                        className="pnl-heatmap__cell"
                        style={{ background: heatColor(val, flatMax) }}
                        title={formatCurrency(val)}
                      >
                        {val ? formatCurrency(val) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
