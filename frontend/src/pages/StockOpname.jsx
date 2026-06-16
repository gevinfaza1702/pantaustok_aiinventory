import { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, RefreshCw, CheckCircle2, X, Save } from 'lucide-react';
import { stockOpnameAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/i18n';
import { formatDate } from '../utils/formatters';
import './StockOpname.css';

const STATUS_CLASS = {
  draft: 'opname-status--draft',
  in_progress: 'opname-status--progress',
  completed: 'opname-status--done',
};

export default function StockOpname() {
  const { t } = useI18n();
  const { hasRole } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);     // active session detail
  const [counts, setCounts] = useState({});       // item_id -> counted qty
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const r = await stockOpnameAPI.list();
      setSessions(r.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); }, []);

  const openSession = async (id) => {
    const r = await stockOpnameAPI.getById(id);
    setDetail(r.data);
    const seed = {};
    r.data.items.forEach((it) => { seed[it.id] = it.counted_qty ?? ''; });
    setCounts(seed);
  };

  const createSession = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await stockOpnameAPI.create({ name: newName });
      setShowCreate(false);
      setNewName('');
      await fetchSessions();
      await openSession(r.data.id);
    } catch (e) { console.error(e); } finally { setBusy(false); }
  };

  const saveCounts = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const items = Object.entries(counts)
        .filter(([, v]) => v !== '' && v !== null)
        .map(([item_id, v]) => ({ item_id, counted_qty: Number(v) }));
      const r = await stockOpnameAPI.recordCounts(detail.id, items);
      setDetail(r.data);
    } catch (e) { console.error(e); } finally { setBusy(false); }
  };

  const approve = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await stockOpnameAPI.approve(detail.id);
      await openSession(detail.id);
      await fetchSessions();
    } catch (e) {
      alert(e.response?.data?.detail || 'Gagal menyetujui');
    } finally { setBusy(false); }
  };

  const discrepancyCount = detail?.items.filter((i) => i.counted_qty !== null && i.discrepancy !== 0).length || 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="opname-heading">
          <ClipboardCheck size={22} className="opname-heading__icon" />
          <h1>{t('opname.title')}</h1>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={fetchSessions}><RefreshCw size={14} /> {t('common.refresh')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> {t('opname.new')}</button>
        </div>
      </div>

      <div className="opname-layout">
        {/* Sessions list */}
        <div className="opname-sessions">
          {loading ? (
            <div className="opname-loading"><div className="spinner" /></div>
          ) : sessions.length === 0 ? (
            <p className="opname-empty">Belum ada sesi stok opname.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                className={`opname-session ${detail?.id === s.id ? 'opname-session--active' : ''}`}
                onClick={() => openSession(s.id)}
              >
                <div className="opname-session__top">
                  <span className="opname-session__name">{s.name}</span>
                  <span className={`opname-status ${STATUS_CLASS[s.status]}`}>{s.status}</span>
                </div>
                <span className="opname-session__meta">
                  {s.created_by} · {formatDate(s.created_at)}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Detail / count form */}
        <div className="opname-detail">
          {!detail ? (
            <div className="opname-detail__empty">
              <ClipboardCheck size={40} />
              <p>Pilih atau buat sesi untuk mulai menghitung.</p>
            </div>
          ) : (
            <>
              <div className="opname-detail__header">
                <div>
                  <h2>{detail.name}</h2>
                  <span className={`opname-status ${STATUS_CLASS[detail.status]}`}>{detail.status}</span>
                  {discrepancyCount > 0 && (
                    <span className="opname-disc-badge">{discrepancyCount} selisih</span>
                  )}
                </div>
                {detail.status !== 'completed' && (
                  <div className="opname-detail__actions">
                    <button className="btn btn-secondary" onClick={saveCounts} disabled={busy}>
                      <Save size={14} /> Simpan
                    </button>
                    {hasRole('manager') && (
                      <button className="btn btn-primary" onClick={approve} disabled={busy}>
                        <CheckCircle2 size={14} /> {t('opname.approve')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="opname-table-wrap">
                <table className="opname-table">
                  <thead>
                    <tr>
                      <th>SKU</th><th>Produk</th>
                      <th>{t('opname.systemQty')}</th>
                      <th>{t('opname.countedQty')}</th>
                      <th>{t('opname.discrepancy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((it) => {
                      const counted = counts[it.id];
                      const disc = counted === '' || counted == null ? null : Number(counted) - it.system_qty;
                      return (
                        <tr key={it.id} className={it.is_adjusted ? 'opname-row--adjusted' : ''}>
                          <td className="opname-sku">{it.sku}</td>
                          <td>{it.product_name}</td>
                          <td>{it.system_qty}</td>
                          <td>
                            {detail.status === 'completed' ? (
                              it.counted_qty ?? '—'
                            ) : (
                              <input
                                type="number"
                                className="opname-input"
                                value={counts[it.id] ?? ''}
                                onChange={(e) => setCounts((c) => ({ ...c, [it.id]: e.target.value }))}
                              />
                            )}
                          </td>
                          <td>
                            {disc === null ? '—' : (
                              <span className={disc === 0 ? 'text-secondary' : disc > 0 ? 'text-success' : 'text-danger'}>
                                {disc > 0 ? `+${disc}` : disc}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="opname-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="opname-modal" onClick={(e) => e.stopPropagation()}>
            <div className="opname-modal__header">
              <h2>{t('opname.new')}</h2>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={createSession} className="opname-form">
              <label>Nama Sesi
                <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Opname Gudang Juni" />
              </label>
              <p className="opname-form__hint">Semua produk aktif akan dimasukkan ke sesi ini.</p>
              <div className="opname-form__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
