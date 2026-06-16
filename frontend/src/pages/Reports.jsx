/**
 * Reports & Exports Page
 * Download inventory, movement, and supplier reports as CSV.
 * Also shows the Audit Trail.
 */

import { useEffect, useState } from 'react';
import { exportAPI, auditAPI, reportsAPI } from '../services/api';
import { FileText, Download, Clock, Package, TruckIcon, Users, RefreshCw, FilePlus2, Mail, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/formatters';
import './Reports.css';

const EXPORT_CARDS = [
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventory Valuation',
    desc: 'Complete stock snapshot with cost prices, quantities, and total value by product.',
    color: 'accent',
    getUrl: () => exportAPI.downloadInventory(),
    filename: 'inventory.csv',
  },
  {
    id: 'movements-30',
    icon: TruckIcon,
    title: 'Movement Log (30 days)',
    desc: 'All stock IN / OUT / adjustment transactions for the past 30 days.',
    color: 'success',
    getUrl: () => exportAPI.downloadMovements(30),
    filename: 'movements_30d.csv',
  },
  {
    id: 'movements-90',
    icon: TruckIcon,
    title: 'Movement Log (90 days)',
    desc: 'Broader 3-month movement history for compliance and trend analysis.',
    color: 'info',
    getUrl: () => exportAPI.downloadMovements(90),
    filename: 'movements_90d.csv',
  },
  {
    id: 'suppliers',
    icon: Users,
    title: 'Supplier Directory',
    desc: 'Full supplier list with contacts, reliability scores, and status.',
    color: 'warning',
    getUrl: () => exportAPI.downloadSuppliers(),
    filename: 'suppliers.csv',
  },
];

const ACTION_ICON = {
  create: '🟢',
  update: '🔵',
  delete: '🔴',
  import: '📥',
  scan:   '📷',
  default: '⚪',
};

export default function Reports() {
  const { hasRole } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [auditFilter, setAuditFilter] = useState('');

  // Scheduled reports
  const [schedules, setSchedules] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: '', report_type: 'inventory', frequency: 'weekly', recipients: '',
  });

  const fetchSchedules = async () => {
    try {
      const r = await reportsAPI.getSchedules();
      setSchedules(r.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSchedules(); }, []);

  const generatePdf = async (reportType) => {
    setGenerating(reportType);
    try {
      const r = await reportsAPI.generate({ report_type: reportType });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat PDF');
    } finally { setGenerating(null); }
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    try {
      const recipients = scheduleForm.recipients.split(',').map((s) => s.trim()).filter(Boolean);
      await reportsAPI.createSchedule({ ...scheduleForm, recipients });
      setShowSchedule(false);
      setScheduleForm({ name: '', report_type: 'inventory', frequency: 'weekly', recipients: '' });
      await fetchSchedules();
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal membuat jadwal');
    }
  };

  const removeSchedule = async (id) => {
    try {
      await reportsAPI.deleteSchedule(id);
      await fetchSchedules();
    } catch (err) { console.error(err); }
  };

  const fetchAudit = async () => {
    setLoadingAudit(true);
    try {
      const r = await auditAPI.getLogs({ limit: 100, ...(auditFilter ? { entity_type: auditFilter } : {}) });
      setAuditLogs(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => { fetchAudit(); }, [auditFilter]);

  const handleDownload = (card) => {
    const url = card.getUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = card.filename;
    a.click();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reports &amp; Exports</h1>
      </div>

      {/* Export Cards */}
      <section className="reports-section">
        <h2 className="reports-section__title">Export Data</h2>
        <div className="export-grid">
          {EXPORT_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="export-card">
                <div className={`export-card__icon export-card__icon--${card.color}`}>
                  <Icon size={22} />
                </div>
                <div className="export-card__body">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
                <button
                  className="btn btn-primary export-card__btn"
                  onClick={() => handleDownload(card)}
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* PDF Reports & Schedules */}
      <section className="reports-section">
        <div className="audit-header">
          <h2 className="reports-section__title">PDF Reports &amp; Jadwal</h2>
          {hasRole('manager') && (
            <button className="btn btn-primary" onClick={() => setShowSchedule(true)}>
              <FilePlus2 size={14} /> Jadwalkan Laporan
            </button>
          )}
        </div>

        <div className="report-gen-row">
          <button className="btn btn-secondary" disabled={generating === 'inventory'} onClick={() => generatePdf('inventory')}>
            <Download size={14} /> {generating === 'inventory' ? '...' : 'PDF Inventaris'}
          </button>
          <button className="btn btn-secondary" disabled={generating === 'pnl'} onClick={() => generatePdf('pnl')}>
            <Download size={14} /> {generating === 'pnl' ? '...' : 'PDF Laba Rugi'}
          </button>
        </div>

        {schedules.length > 0 && (
          <div className="schedule-list">
            {schedules.map((s) => (
              <div key={s.id} className="schedule-item">
                <div className="schedule-item__info">
                  <span className="schedule-item__name">{s.name}</span>
                  <span className="schedule-item__meta">
                    {s.report_type} · {s.frequency}
                    {s.recipients.length > 0 && <> · <Mail size={11} /> {s.recipients.length}</>}
                    {s.last_sent && <> · terkirim {formatDate(s.last_sent)}</>}
                  </span>
                </div>
                {hasRole('manager') && (
                  <button className="schedule-item__del" onClick={() => removeSchedule(s.id)} title="Hapus">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audit Trail */}
      <section className="reports-section">
        <div className="audit-header">
          <h2 className="reports-section__title">Audit Trail</h2>
          <div className="audit-filters">
            {['', 'product', 'supplier', 'movement', 'import'].map(f => (
              <button
                key={f}
                className={`intel-filter-btn ${auditFilter === f ? 'intel-filter-btn--active' : ''}`}
                onClick={() => setAuditFilter(f)}
              >
                {f || 'All'}
              </button>
            ))}
            <button className="btn btn-secondary" onClick={fetchAudit}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div className="audit-table-wrap">
          {loadingAudit ? (
            <div className="audit-loading">
              <div className="spinner" /> Loading logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="audit-empty">
              <Clock size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No audit logs yet. Activity will appear here as the system is used.</p>
            </div>
          ) : (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Action</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="audit-time">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        dateStyle: 'short', timeStyle: 'short'
                      })}
                    </td>
                    <td className="audit-actor">{log.actor}</td>
                    <td>
                      <span className="audit-entity">{log.entity_type}</span>
                    </td>
                    <td>
                      <span className="audit-action">
                        {ACTION_ICON[log.action] || ACTION_ICON.default} {log.action}
                      </span>
                    </td>
                    <td className="audit-desc">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Schedule modal */}
      {showSchedule && (
        <div className="report-modal-overlay" onClick={() => setShowSchedule(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal__header">
              <h2>Jadwalkan Laporan</h2>
              <button onClick={() => setShowSchedule(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submitSchedule} className="report-form">
              <label>Nama
                <input required value={scheduleForm.name}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label>Tipe Laporan
                <select value={scheduleForm.report_type}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, report_type: e.target.value }))}>
                  <option value="inventory">Inventaris</option>
                  <option value="pnl">Laba Rugi</option>
                </select>
              </label>
              <label>Frekuensi
                <select value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, frequency: e.target.value }))}>
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </select>
              </label>
              <label>Penerima Email <span className="report-form__opt">(pisahkan dengan koma)</span>
                <input value={scheduleForm.recipients} placeholder="a@toko.com, b@toko.com"
                  onChange={(e) => setScheduleForm((f) => ({ ...f, recipients: e.target.value }))} />
              </label>
              <p className="report-form__note">
                Email akan terkirim otomatis bila SMTP dikonfigurasi di <code>.env</code>. PDF tetap bisa diunduh manual kapan saja.
              </p>
              <div className="report-form__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSchedule(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Jadwal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
