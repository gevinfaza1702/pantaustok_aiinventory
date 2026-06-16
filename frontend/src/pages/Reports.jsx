/**
 * Reports & Exports Page
 * Download inventory, movement, and supplier reports as CSV.
 * Also shows the Audit Trail.
 */

import { useEffect, useState } from 'react';
import { exportAPI, auditAPI } from '../services/api';
import { FileText, Download, Clock, Package, TruckIcon, Users, RefreshCw } from 'lucide-react';
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [auditFilter, setAuditFilter] = useState('');

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
    </div>
  );
}
