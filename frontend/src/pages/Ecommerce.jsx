import { useEffect, useState } from 'react';
import { Store, Plus, RefreshCw, RotateCw, X, CheckCircle2 } from 'lucide-react';
import { ecommerceAPI } from '../services/api';
import { useI18n } from '../i18n/i18n';
import { formatDate } from '../utils/formatters';
import './Ecommerce.css';

const PLATFORMS = [
  { id: 'tokopedia',   name: 'Tokopedia',   color: '#42b549' },
  { id: 'shopee',      name: 'Shopee',      color: '#ee4d2d' },
  { id: 'woocommerce', name: 'WooCommerce', color: '#7f54b3' },
];
const PLATFORM_META = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

export default function Ecommerce() {
  const { t } = useI18n();
  const [channels, setChannels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ platform: 'tokopedia', store_name: '', api_key: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, o] = await Promise.all([ecommerceAPI.getChannels(), ecommerceAPI.getOrders()]);
      setChannels(c.data);
      setOrders(o.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const sync = async (id) => {
    setSyncing(id);
    try {
      await ecommerceAPI.sync(id);
      await fetchAll();
    } catch (e) { console.error(e); } finally { setSyncing(null); }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    try {
      await ecommerceAPI.createChannel(form);
      setShowAdd(false);
      setForm({ platform: 'tokopedia', store_name: '', api_key: '' });
      await fetchAll();
    } catch (e) {
      alert(e.response?.data?.detail || 'Gagal menambah channel');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="ec-heading">
          <Store size={22} className="ec-heading__icon" />
          <h1>{t('ec.title')}</h1>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={fetchAll}><RefreshCw size={14} /> {t('common.refresh')}</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> {t('ec.connect')}</button>
        </div>
      </div>

      {/* Channel cards */}
      {loading ? (
        <div className="ec-loading"><div className="spinner" /></div>
      ) : (
        <div className="ec-grid">
          {channels.length === 0 ? (
            <div className="ec-empty">
              <Store size={44} />
              <p>Belum ada channel terhubung. Hubungkan toko online pertama Anda.</p>
            </div>
          ) : channels.map((c) => {
            const meta = PLATFORM_META[c.platform] || { name: c.platform, color: 'var(--accent)' };
            return (
              <div key={c.id} className="ec-card">
                <div className="ec-card__top">
                  <div className="ec-card__logo" style={{ background: meta.color }}>
                    {meta.name.charAt(0)}
                  </div>
                  <span className={`ec-card__status ${c.is_active ? 'ec-card__status--on' : ''}`}>
                    {c.is_active ? 'Terhubung' : 'Nonaktif'}
                  </span>
                </div>
                <h3 className="ec-card__platform">{meta.name}</h3>
                <span className="ec-card__store">{c.store_name}</span>
                <div className="ec-card__meta">
                  <span>{c.order_count} pesanan</span>
                  <span>{c.last_sync ? `Sync: ${formatDate(c.last_sync, true)}` : 'Belum sync'}</span>
                </div>
                <button className="btn btn-secondary ec-card__sync" disabled={syncing === c.id} onClick={() => sync(c.id)}>
                  <RotateCw size={14} className={syncing === c.id ? 'animate-spin' : ''} /> {t('ec.sync')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent orders */}
      <div className="ec-orders">
        <h2 className="ec-section-title">{t('ec.orders')}</h2>
        {orders.length === 0 ? (
          <p className="ec-orders__empty">Belum ada pesanan tersinkronisasi. Klik Sync pada channel untuk menarik pesanan.</p>
        ) : (
          <table className="ec-table">
            <thead>
              <tr><th>Order ID</th><th>Platform</th><th>Produk</th><th>Qty</th><th>{t('common.status')}</th><th>Waktu</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="ec-orderid">{o.external_order_id}</td>
                  <td>{PLATFORM_META[o.platform]?.name || o.platform}</td>
                  <td>{o.product_name}</td>
                  <td>{o.quantity}</td>
                  <td><span className="ec-order-status"><CheckCircle2 size={13} /> {o.status}</span></td>
                  <td className="text-secondary text-sm">{formatDate(o.synced_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add channel modal */}
      {showAdd && (
        <div className="ec-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="ec-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ec-modal__header">
              <h2>{t('ec.connect')}</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submitAdd} className="ec-form">
              <label>Platform
                <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>Nama Toko
                <input required value={form.store_name} onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))} />
              </label>
              <label>API Key <span className="ec-form__opt">(opsional, mock)</span>
                <input value={form.api_key} onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))} placeholder="Isi nanti saat integrasi nyata" />
              </label>
              <div className="ec-form__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('ec.connect')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
