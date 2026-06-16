import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Globe,
  Lock,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/i18n';
import './Login.css';

const loginHighlights = [
  { icon: BarChart3, label: { id: 'Forecast demand', en: 'Demand forecast' }, value: '+18%' },
  { icon: Boxes, label: { id: 'Kesehatan stok', en: 'Stock health' }, value: '92%' },
  { icon: ScanLine, label: { id: 'Scan siap', en: 'Scan ready' }, value: '24/7' },
];

const LOGIN_COPY = {
  id: {
    headline: 'Masuk ke pusat kendali stok.',
    subline:
      'Pantau produk, gudang, forecast, reorder, laporan, dan AI assistant dari satu workspace operasional.',
    badge: 'Inventory intelligence workspace',
    previewTitle: 'Inventory Pulse',
    previewSub: 'AI risk scan and stock movement summary',
    previewNote: '8 SKU siap reorder otomatis hari ini',
    secure: 'Akses aman berbasis role',
    console: 'Konsol operasional',
  },
  en: {
    headline: 'Enter the stock command center.',
    subline:
      'Monitor products, warehouses, forecasts, reorder, reports, and the AI assistant from one operational workspace.',
    badge: 'Inventory intelligence workspace',
    previewTitle: 'Inventory Pulse',
    previewSub: 'AI risk scan and stock movement summary',
    previewNote: '8 SKUs are ready for automated reorder today',
    secure: 'Role-based secure access',
    console: 'Operations console',
  },
};

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const copy = LOGIN_COPY[lang] || LOGIN_COPY.id;

  // Already logged in? Skip the login screen.
  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('auth.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <div className="login__nav">
        <Link to="/" className="login__back">
          <ArrowLeft size={15} />
          <span>PantauStok AI</span>
        </Link>
        <button className="login__lang" onClick={toggleLang} title="Language">
          <Globe size={15} /> {lang.toUpperCase()}
        </button>
      </div>

      <div className="login__scene" aria-hidden="true">
        <div className="login__grid" />
        <div className="login__beam login__beam--one" />
        <div className="login__beam login__beam--two" />
      </div>

      <main className="login__shell">
        <section className="login__showcase" aria-label="PantauStok overview">
          <div className="login__pill">
            <Sparkles size={15} />
            <span>{copy.badge}</span>
          </div>

          <h1>{copy.headline}</h1>
          <p>{copy.subline}</p>

          <div className="login__preview">
            <div className="login__preview-top">
              <span />
              <span />
              <span />
              <div className="login__preview-status">
                <Zap size={14} />
                Live
              </div>
            </div>

            <div className="login__preview-head">
              <div>
                <strong>{copy.previewTitle}</strong>
                <small>{copy.previewSub}</small>
              </div>
              <div className="login__preview-score">97%</div>
            </div>

            <div className="login__preview-chart">
              <span style={{ '--height': '44%' }} />
              <span style={{ '--height': '58%' }} />
              <span style={{ '--height': '36%' }} />
              <span style={{ '--height': '74%' }} />
              <span style={{ '--height': '62%' }} />
              <span style={{ '--height': '86%' }} />
              <span style={{ '--height': '68%' }} />
            </div>

            <div className="login__preview-note">
              <CheckCircle2 size={16} />
              <span>{copy.previewNote}</span>
            </div>
          </div>

          <div className="login__highlights">
            {loginHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.value} className="login__highlight">
                  <Icon size={17} />
                  <span>{item.label[lang] || item.label.id}</span>
                  <strong>{item.value}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="login__card" aria-label="Login form">
          <div className="login__brand">
            <div className="login__logo">
              <img src="/logo.png" alt="" />
            </div>
            <div>
              <span className="login__brand-name">{t('app.name')}</span>
              <span className="login__brand-sub">{copy.console}</span>
            </div>
          </div>

          <div className="login__secure">
            <ShieldCheck size={16} />
            <span>{copy.secure}</span>
          </div>

          <h2 className="login__title">{t('auth.welcomeBack')}</h2>
          <p className="login__subtitle">{t('auth.subtitle')}</p>

          {error && (
            <div className="login__error">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login__form">
            <label className="login__field">
              <span className="login__field-label">{t('auth.username')}</span>
              <User size={16} className="login__field-icon" />
              <input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label className="login__field">
              <span className="login__field-label">{t('auth.password')}</span>
              <Lock size={16} className="login__field-icon" />
              <input
                type="password"
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="login__submit" disabled={submitting}>
              <PackageCheck size={17} />
              <span>{submitting ? t('auth.signingIn') : t('auth.signIn')}</span>
              {!submitting && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="login__hint">Default admin: <code>admin</code> / <code>admin123</code></p>
        </section>
      </main>
    </div>
  );
}
