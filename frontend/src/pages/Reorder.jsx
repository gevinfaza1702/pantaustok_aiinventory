/**
 * Smart Reorder System Page
 * Shows products needing reorder + all purchase orders.
 */

import { useEffect, useState } from 'react';
import { reorderAPI } from '../services/api';
import { ShoppingCart, AlertTriangle, CheckCircle, Clock, Package, RefreshCw, X, PackageCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import Badge from '../components/Badge';
import './Reorder.css';

const STATUS_BADGE = {
  pending:   'warning',
  ordered:   'info',
  partial:   'accent',
  received:  'success',
  cancelled: 'danger',
};

const NEXT_STATUS = {
  pending:  'ordered',
};

export default function Reorder() {
  const [suggestions, setSuggestions] = useState([]);
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [placing, setPlacing]         = useState(null);
  const [tab, setTab]                 = useState('suggestions'); // 'suggestions' | 'orders'
  const [detailPO, setDetailPO]       = useState(null);   // selected PO for the detail modal
  const [timeline, setTimeline]       = useState(null);
  const [receiveQty, setReceiveQty]   = useState('');
  const [receiving, setReceiving]     = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, oRes] = await Promise.all([
        reorderAPI.getSuggestions(),
        reorderAPI.getOrders(),
      ]);
      setSuggestions(sRes.data);
      setOrders(oRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handlePlaceOrder = async (s) => {
    setPlacing(s.product_id);
    try {
      await reorderAPI.placeOrder({
        product_id: s.product_id,
        order_qty:  s.suggested_qty,
        trigger:    'auto_reorder',
      });
      await fetchAll();
      setTab('orders');
    } catch (err) {
      console.error(err);
    } finally {
      setPlacing(null);
    }
  };

  const handleAdvanceStatus = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await reorderAPI.updateStatus(order.id, next);
      await fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const openDetail = async (order) => {
    setDetailPO(order);
    setTimeline(null);
    setReceiveQty(String(Math.max(1, order.order_qty - (order.received_qty || 0))));
    try {
      const r = await reorderAPI.getTimeline(order.id);
      setTimeline(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  const closeDetail = () => { setDetailPO(null); setTimeline(null); };

  const handleReceive = async () => {
    if (!detailPO) return;
    const qty = Number(receiveQty);
    if (!qty || qty <= 0) return;
    setReceiving(true);
    try {
      await reorderAPI.receive(detailPO.id, { received_qty: qty });
      await fetchAll();
      closeDetail();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Gagal mencatat penerimaan');
    } finally {
      setReceiving(false);
    }
  };

  const criticalCount = suggestions.filter(s => s.urgency === 'critical').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="reorder-heading">
          <ShoppingCart size={22} className="reorder-heading__icon" />
          <div>
            <h1>Smart Reorder System</h1>
            <p className="reorder-heading__sub">
              {suggestions.length} products need reordering · {criticalCount} critical
            </p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={fetchAll}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="reorder-tabs">
        <button
          className={`reorder-tab ${tab === 'suggestions' ? 'reorder-tab--active' : ''}`}
          onClick={() => setTab('suggestions')}
        >
          Reorder Suggestions
          {suggestions.length > 0 && (
            <span className="reorder-tab__badge">{suggestions.length}</span>
          )}
        </button>
        <button
          className={`reorder-tab ${tab === 'orders' ? 'reorder-tab--active' : ''}`}
          onClick={() => setTab('orders')}
        >
          Purchase Orders
          {orders.length > 0 && (
            <span className="reorder-tab__badge">{orders.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="reorder-loading">
          <div className="spinner" />
          <span>Loading data...</span>
        </div>
      ) : tab === 'suggestions' ? (
        /* ── Suggestions ── */
        suggestions.length === 0 ? (
          <div className="reorder-empty">
            <CheckCircle size={48} className="reorder-empty__icon" />
            <h2>All Stock Levels Healthy</h2>
            <p>No products require reordering at this time.</p>
          </div>
        ) : (
          <div className="reorder-grid">
            {suggestions.map(s => (
              <div
                key={s.product_id}
                className={`reorder-card reorder-card--${s.urgency}`}
              >
                <div className="reorder-card__header">
                  <div className="reorder-card__info">
                    <span className="reorder-card__sku">{s.sku}</span>
                    <h3 className="reorder-card__name">{s.product_name}</h3>
                  </div>
                  <Badge type={s.urgency === 'critical' ? 'danger' : 'warning'} text={s.urgency} />
                </div>

                <div className="reorder-card__stats">
                  <div className="reorder-stat">
                    <span className="reorder-stat__label">Current</span>
                    <span className={`reorder-stat__value ${s.urgency === 'critical' ? 'text-danger' : 'text-warning'}`}>
                      {s.current_stock}
                    </span>
                  </div>
                  <div className="reorder-stat">
                    <span className="reorder-stat__label">Min Stock</span>
                    <span className="reorder-stat__value">{s.min_stock}</span>
                  </div>
                  <div className="reorder-stat">
                    <span className="reorder-stat__label">Suggest Qty</span>
                    <span className="reorder-stat__value text-accent">{s.suggested_qty}</span>
                  </div>
                  <div className="reorder-stat">
                    <span className="reorder-stat__label">Est. Cost</span>
                    <span className="reorder-stat__value">{formatCurrency(s.unit_cost * s.suggested_qty)}</span>
                  </div>
                </div>

                <div className="reorder-card__footer">
                  <span className="reorder-card__lead">
                    <Clock size={12} /> Lead time: {s.lead_time_days}d
                  </span>
                  <button
                    className="btn btn-primary"
                    disabled={placing === s.product_id}
                    onClick={() => handlePlaceOrder(s)}
                  >
                    {placing === s.product_id ? 'Placing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Purchase Orders ── */
        orders.length === 0 ? (
          <div className="reorder-empty">
            <Package size={48} className="reorder-empty__icon" />
            <h2>No Purchase Orders Yet</h2>
            <p>Place orders from the Reorder Suggestions tab.</p>
          </div>
        ) : (
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th>Order Qty</th>
                  <th>Total Cost</th>
                  <th>Triggered By</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="font-medium">{o.product_name}</td>
                    <td className="text-secondary">{o.supplier_name}</td>
                    <td className="font-semibold">{o.order_qty}</td>
                    <td>{formatCurrency(o.total_cost)}</td>
                    <td><Badge type={o.trigger === 'auto_reorder' ? 'accent' : 'neutral'} text={o.trigger} /></td>
                    <td><Badge type={STATUS_BADGE[o.status] || 'neutral'} text={o.status} /></td>
                    <td className="text-secondary text-sm">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="po-actions">
                      {NEXT_STATUS[o.status] && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleAdvanceStatus(o)}
                        >
                          → {NEXT_STATUS[o.status]}
                        </button>
                      )}
                      <button className="btn btn-secondary" onClick={() => openDetail(o)}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── PO Detail / Timeline Modal ── */}
      {detailPO && (
        <div className="po-modal-overlay" onClick={closeDetail}>
          <div className="po-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal__header">
              <div>
                <h2>{detailPO.product_name}</h2>
                <span className="po-modal__sub">{detailPO.supplier_name} · {detailPO.order_qty} unit</span>
              </div>
              <button onClick={closeDetail}><X size={18} /></button>
            </div>

            <div className="po-modal__body">
              {/* Timeline */}
              <div className="po-timeline">
                {!timeline ? (
                  <div className="reorder-loading"><div className="spinner" /></div>
                ) : (
                  timeline.timeline.map((ev) => (
                    <div key={ev.stage} className={`po-timeline__step ${ev.done ? 'po-timeline__step--done' : ''}`}>
                      <div className="po-timeline__dot" />
                      <div className="po-timeline__content">
                        <span className="po-timeline__label">{ev.label}</span>
                        <span className="po-timeline__date">{ev.at ? formatDate(ev.at, true) : '—'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Lead-time accuracy */}
              {timeline?.lead_time_accuracy && (
                <div className={`po-leadtime ${timeline.lead_time_accuracy.on_time ? 'po-leadtime--ok' : 'po-leadtime--late'}`}>
                  {timeline.lead_time_accuracy.on_time
                    ? 'Tiba tepat waktu ✓'
                    : `Terlambat ${timeline.lead_time_accuracy.delta_days} hari`}
                </div>
              )}

              {/* Partial receive */}
              {detailPO.status !== 'received' && detailPO.status !== 'cancelled' && (
                <div className="po-receive">
                  <h3><PackageCheck size={16} /> Terima Barang</h3>
                  <p className="po-receive__hint">
                    Sudah diterima: {detailPO.received_qty || 0} / {detailPO.order_qty}
                  </p>
                  <div className="po-receive__row">
                    <input
                      type="number"
                      min="1"
                      max={detailPO.order_qty - (detailPO.received_qty || 0)}
                      value={receiveQty}
                      onChange={(e) => setReceiveQty(e.target.value)}
                    />
                    <button className="btn btn-primary" disabled={receiving} onClick={handleReceive}>
                      {receiving ? '...' : 'Catat Penerimaan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
