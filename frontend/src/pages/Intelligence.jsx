/**
 * Intelligence Hub Page
 * Combines ABC Analysis + Dead Stock Detection + Supplier Performance.
 */

import { useEffect, useState } from 'react';
import { intelligenceAPI } from '../services/api';
import { BarChart2, AlertOctagon, Users, RefreshCw, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale,
  LinearScale, Tooltip, Legend
} from 'chart.js';
import './Intelligence.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const TABS = [
  { id: 'abc',      label: 'ABC Analysis',           icon: BarChart2 },
  { id: 'deadstock', label: 'Dead Stock',             icon: AlertOctagon },
  { id: 'suppliers', label: 'Supplier Performance',  icon: Users },
];

const CLASS_COLOR = { A: '#22c55e', B: '#f59e0b', C: '#ef4444' };

export default function Intelligence() {
  const [tab, setTab]           = useState('abc');
  const [abc, setAbc]           = useState(null);
  const [dead, setDead]         = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [days, setDays]         = useState(30);

  const fetchTab = async (t) => {
    setLoading(true);
    try {
      if (t === 'abc' && !abc) {
        const r = await intelligenceAPI.getABC();
        setAbc(r.data);
      }
      if (t === 'deadstock') {
        const r = await intelligenceAPI.getDeadStock(days);
        setDead(r.data);
      }
      if (t === 'suppliers' && !suppliers.length) {
        const r = await intelligenceAPI.getSupplierPerf();
        setSuppliers(r.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTab(tab); }, [tab, days]);

  // ── ABC Chart Data ──
  const abcChartData = abc ? {
    labels: ['Class A (Top 70%)', 'Class B (Next 20%)', 'Class C (Bottom 10%)'],
    datasets: [{
      data: [abc.summary.A, abc.summary.B, abc.summary.C],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderColor: 'transparent',
      hoverOffset: 6,
    }],
  } : null;

  // ── Supplier Score Chart ──
  const supplierChartData = suppliers.length ? {
    labels: suppliers.map(s => s.name.split(' ')[0]),
    datasets: [{
      label: 'Reliability %',
      data: suppliers.map(s => s.reliability_pct),
      backgroundColor: suppliers.map(s =>
        s.reliability_pct >= 90 ? '#22c55e' :
        s.reliability_pct >= 75 ? '#f59e0b' : '#ef4444'
      ),
      borderRadius: 6,
      borderSkipped: false,
    }],
  } : null;

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6278', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c6278', font: { size: 11 } }, max: 100 },
    },
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Intelligence Hub</h1>
      </div>

      {/* Tabs */}
      <div className="intel-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`intel-tab ${tab === t.id ? 'intel-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: 'var(--text-secondary)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* ── ABC Analysis ── */}
          {tab === 'abc' && abc && (
            <div className="intel-section animate-fade-in">
              <div className="intel-summary-cards">
                {['A', 'B', 'C'].map(cls => (
                  <div key={cls} className="intel-summary-card" style={{ borderLeftColor: CLASS_COLOR[cls] }}>
                    <div className="intel-summary-card__class" style={{ color: CLASS_COLOR[cls] }}>Class {cls}</div>
                    <div className="intel-summary-card__count">{abc.summary[cls]} products</div>
                    <div className="intel-summary-card__desc">
                      {cls === 'A' ? 'Top 70% of value — prioritize' :
                       cls === 'B' ? 'Mid 20% — monitor regularly' :
                       'Bottom 10% — review periodically'}
                    </div>
                  </div>
                ))}
                <div className="intel-summary-card intel-summary-card--total">
                  <div className="intel-summary-card__class">Total Value</div>
                  <div className="intel-summary-card__count">{formatCurrency(abc.total_value)}</div>
                  <div className="intel-summary-card__desc">Active inventory valuation</div>
                </div>
              </div>

              <div className="intel-charts-row">
                <div className="chart-card">
                  <div className="chart-card__header"><h3>Value Distribution</h3></div>
                  <div className="chart-card__body" style={{ height: 260 }}>
                    <Doughnut
                      data={abcChartData}
                      options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'right', labels: { color: '#9aa0b5', boxWidth: 12, padding: 16 } },
                          tooltip: { backgroundColor: '#1e2230', titleColor: '#f0f2f7', bodyColor: '#9aa0b5', padding: 12, cornerRadius: 8 },
                        },
                        cutout: '65%',
                      }}
                    />
                  </div>
                </div>

                <div className="intel-abc-table-wrap chart-card">
                  <div className="chart-card__header"><h3>Product Classification</h3></div>
                  <div style={{ overflowY: 'auto', maxHeight: 260 }}>
                    <table className="intel-table">
                      <thead>
                        <tr><th>SKU</th><th>Name</th><th>Category</th><th>Value</th><th>Class</th></tr>
                      </thead>
                      <tbody>
                        {abc.items.slice(0, 20).map(item => (
                          <tr key={item.product_id}>
                            <td className="text-tertiary">{item.sku}</td>
                            <td className="font-medium">{item.name}</td>
                            <td className="text-secondary">{item.category}</td>
                            <td>{formatCurrency(item.value)}</td>
                            <td>
                              <span className="abc-badge" style={{ background: `${CLASS_COLOR[item.class]}20`, color: CLASS_COLOR[item.class] }}>
                                {item.class}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Dead Stock ── */}
          {tab === 'deadstock' && (
            <div className="intel-section animate-fade-in">
              <div className="intel-filter">
                <label>No movement in last:</label>
                {[7, 14, 30, 60, 90].map(d => (
                  <button
                    key={d}
                    className={`intel-filter-btn ${days === d ? 'intel-filter-btn--active' : ''}`}
                    onClick={() => setDays(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              {dead.length === 0 ? (
                <div className="intel-empty">
                  <TrendingDown size={48} className="intel-empty__icon" />
                  <h3>No dead stock detected in this period</h3>
                </div>
              ) : (
                <div className="intel-dead-grid">
                  {dead.map(item => (
                    <div key={item.product_id} className="dead-card">
                      <div className="dead-card__top">
                        <div>
                          <span className="dead-card__sku">{item.sku}</span>
                          <h3 className="dead-card__name">{item.name}</h3>
                          <span className="dead-card__cat">{item.category}</span>
                        </div>
                        <div className="dead-card__value">{formatCurrency(item.dead_value)}</div>
                      </div>
                      <div className="dead-card__stats">
                        <div className="dead-stat">
                          <span>Stock</span>
                          <strong className="text-warning">{item.current_stock} {item.unit}</strong>
                        </div>
                        <div className="dead-stat">
                          <span>Idle</span>
                          <strong>{item.days_no_movement}+ days</strong>
                        </div>
                      </div>
                      <p className="dead-card__tip">{item.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Supplier Performance ── */}
          {tab === 'suppliers' && (
            <div className="intel-section animate-fade-in">
              {supplierChartData && (
                <div className="chart-card" style={{ marginBottom: 24 }}>
                  <div className="chart-card__header">
                    <h3>Reliability Score by Supplier</h3>
                    <span>Higher is better</span>
                  </div>
                  <div className="chart-card__body" style={{ height: 200 }}>
                    <Bar data={supplierChartData} options={chartOpts} />
                  </div>
                </div>
              )}

              <div className="intel-supplier-grid">
                {suppliers.map(s => (
                  <div key={s.supplier_id} className="supplier-perf-card">
                    <div className="supplier-perf-card__header">
                      <div>
                        <h3 className="supplier-perf-card__name">{s.name}</h3>
                        <p className="supplier-perf-card__contact">{s.email}</p>
                      </div>
                      <div
                        className="supplier-perf-card__tier"
                        style={{
                          background: s.performance_tier === 'Excellent' ? 'var(--success-muted)' :
                                      s.performance_tier === 'Good'      ? 'var(--info-muted)' :
                                      s.performance_tier === 'Fair'      ? 'var(--warning-muted)' : 'var(--danger-muted)',
                          color: s.performance_tier === 'Excellent' ? 'var(--success)' :
                                 s.performance_tier === 'Good'      ? 'var(--info)' :
                                 s.performance_tier === 'Fair'      ? 'var(--warning)' : 'var(--danger)',
                        }}
                      >
                        {s.performance_tier}
                      </div>
                    </div>

                    <div className="supplier-perf-card__score">
                      <div className="score-bar-bg">
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${s.reliability_pct}%`,
                            background: s.reliability_pct >= 90 ? 'var(--success)' :
                                        s.reliability_pct >= 75 ? 'var(--warning)' : 'var(--danger)',
                          }}
                        />
                      </div>
                      <span className="score-pct">{s.reliability_pct}%</span>
                    </div>

                    <div className="supplier-perf-card__stats">
                      <div className="sp-stat"><span>Products</span><strong>{s.product_count}</strong></div>
                      <div className="sp-stat"><span>Value</span><strong>{formatCurrency(s.total_supplied_value)}</strong></div>
                      <div className="sp-stat"><span>Low Stock</span><strong className="text-warning">{s.low_stock_products}</strong></div>
                      <div className="sp-stat"><span>Out of Stock</span><strong className="text-danger">{s.out_of_stock_products}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
