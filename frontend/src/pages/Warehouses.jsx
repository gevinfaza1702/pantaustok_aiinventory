import { useEffect, useState } from 'react';
import { Warehouse as WarehouseIcon, Plus, ArrowRightLeft, RefreshCw, Boxes, X } from 'lucide-react';
import { warehouseAPI, productsAPI } from '../services/api';
import { useI18n } from '../i18n/i18n';
import { formatNumber } from '../utils/formatters';
import './Warehouses.css';

export default function Warehouses() {
  const { t } = useI18n();
  const [consolidated, setConsolidated] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: '', to_warehouse_id: '', product_id: '', quantity: 1, notes: '',
  });
  const [addForm, setAddForm] = useState({ name: '', code: '', address: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        warehouseAPI.getConsolidated(),
        productsAPI.getAll({ limit: 1000 }),
      ]);
      setConsolidated(c.data);
      setProducts(p.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const submitTransfer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await warehouseAPI.transfer({ ...transferForm, quantity: Number(transferForm.quantity) });
      setShowTransfer(false);
      setTransferForm({ from_warehouse_id: '', to_warehouse_id: '', product_id: '', quantity: 1, notes: '' });
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Transfer gagal');
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await warehouseAPI.create(addForm);
      setShowAdd(false);
      setAddForm({ name: '', code: '', address: '' });
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal menambah gudang');
    }
  };

  const warehouses = consolidated?.warehouses || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="wh-heading">
          <WarehouseIcon size={22} className="wh-heading__icon" />
          <div>
            <h1>{t('wh.title')}</h1>
            <p className="wh-heading__sub">
              {consolidated?.warehouse_count || 0} {t('nav.warehouses').toLowerCase()} ·{' '}
              {formatNumber(consolidated?.total_units_all || 0)} unit
            </p>
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={fetchAll}><RefreshCw size={14} /> {t('common.refresh')}</button>
          <button className="btn btn-secondary" onClick={() => setShowTransfer(true)}><ArrowRightLeft size={14} /> {t('wh.transfer')}</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> {t('wh.addWarehouse')}</button>
        </div>
      </div>

      {loading ? (
        <div className="wh-loading"><div className="spinner" /><span>{t('common.loading')}</span></div>
      ) : warehouses.length === 0 ? (
        <div className="wh-empty">
          <Boxes size={48} />
          <h2>{t('wh.addWarehouse')}</h2>
          <p>Belum ada gudang. Tambahkan lokasi pertama Anda.</p>
        </div>
      ) : (
        <>
          <div className="wh-grid">
            {warehouses.map(w => (
              <div key={w.id} className={`wh-card ${w.is_default ? 'wh-card--default' : ''}`}>
                <div className="wh-card__top">
                  <div className="wh-card__icon"><WarehouseIcon size={20} /></div>
                  {w.is_default && <span className="wh-card__badge">Default</span>}
                </div>
                <h3 className="wh-card__name">{w.name}</h3>
                <span className="wh-card__code">{w.code}</span>
                <div className="wh-card__stats">
                  <div>
                    <span className="wh-card__stat-val">{formatNumber(w.total_units)}</span>
                    <span className="wh-card__stat-lbl">Total Unit</span>
                  </div>
                  <div>
                    <span className="wh-card__stat-val">{w.sku_count}</span>
                    <span className="wh-card__stat-lbl">SKU</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="wh-consolidated">
            <h2 className="wh-section-title">{t('wh.consolidated')}</h2>
            <table className="wh-table">
              <thead>
                <tr><th>Gudang</th><th>Kode</th><th>Total Unit</th><th>SKU Aktif</th><th>{t('common.status')}</th></tr>
              </thead>
              <tbody>
                {warehouses.map(w => (
                  <tr key={w.id}>
                    <td className="font-medium">{w.name}</td>
                    <td className="text-secondary">{w.code}</td>
                    <td>{formatNumber(w.total_units)}</td>
                    <td>{w.sku_count}</td>
                    <td>
                      <span className={`wh-status ${w.is_active ? 'wh-status--active' : 'wh-status--inactive'}`}>
                        {w.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Transfer modal */}
      {showTransfer && (
        <div className="wh-modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="wh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal__header">
              <h2>{t('wh.transfer')}</h2>
              <button onClick={() => setShowTransfer(false)}><X size={18} /></button>
            </div>
            {error && <div className="wh-modal__error">{error}</div>}
            <form onSubmit={submitTransfer} className="wh-form">
              <label>{t('wh.from')}
                <select required value={transferForm.from_warehouse_id}
                  onChange={(e) => setTransferForm(f => ({ ...f, from_warehouse_id: e.target.value }))}>
                  <option value="">—</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
              <label>{t('wh.to')}
                <select required value={transferForm.to_warehouse_id}
                  onChange={(e) => setTransferForm(f => ({ ...f, to_warehouse_id: e.target.value }))}>
                  <option value="">—</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
              <label>Produk
                <select required value={transferForm.product_id}
                  onChange={(e) => setTransferForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">—</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </label>
              <label>{t('wh.quantity')}
                <input type="number" min="1" required value={transferForm.quantity}
                  onChange={(e) => setTransferForm(f => ({ ...f, quantity: e.target.value }))} />
              </label>
              <div className="wh-form__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransfer(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('wh.transfer')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add warehouse modal */}
      {showAdd && (
        <div className="wh-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="wh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal__header">
              <h2>{t('wh.addWarehouse')}</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            {error && <div className="wh-modal__error">{error}</div>}
            <form onSubmit={submitAdd} className="wh-form">
              <label>Nama
                <input required value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </label>
              <label>Kode
                <input required value={addForm.code} onChange={(e) => setAddForm(f => ({ ...f, code: e.target.value }))} placeholder="WH-01" />
              </label>
              <label>Alamat
                <input value={addForm.address} onChange={(e) => setAddForm(f => ({ ...f, address: e.target.value }))} />
              </label>
              <div className="wh-form__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
