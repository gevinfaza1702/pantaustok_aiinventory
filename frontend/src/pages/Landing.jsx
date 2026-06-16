import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Clock3,
  Globe,
  Layers3,
  LineChart,
  LogIn,
  PackageCheck,
  Radar,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Warehouse,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/i18n';
import './Landing.css';

const COPY = {
  id: {
    badge: 'Inventory intelligence platform',
    eyebrow: 'Forecasting, reorder, dan kontrol stok dalam satu sistem.',
    headline: 'PantauStok AI',
    subline:
      'Sistem inventaris modern untuk membaca demand, menjaga stok aman, mengatur gudang, dan memberi rekomendasi operasional sebelum masalah muncul.',
    primary: 'Masuk Dashboard',
    secondary: 'Lihat Fitur',
    navFeatures: 'Fitur',
    navWorkflow: 'Workflow',
    navSecurity: 'Keamanan',
    navLogin: 'Masuk',
    openDashboard: 'Buka Dashboard',
    liveSignal: 'Sinyal live',
    heroPanelTitle: 'Inventory Command Center',
    heroPanelSubtitle: 'Pergerakan stok, prediksi demand, dan reorder priority',
    stockHealth: 'Stock health',
    forecast: 'Forecast 30 hari',
    reorder: 'Reorder priority',
    aiNarrative: 'AI narrative',
    aiText: 'Risiko out-of-stock turun setelah reorder otomatis dijadwalkan untuk 8 SKU high velocity.',
    featuresTitle: 'Dibangun untuk keputusan stok yang cepat dan presisi',
    featuresSubline:
      'Komponen utama dibuat langsung untuk operasi inventory: bukan sekadar pencatatan, tapi sinyal, aksi, dan audit.',
    workflowTitle: 'Dari data mentah ke tindakan operasional',
    workflowSubline:
      'Tim bisa mulai dari scan produk, melihat prediksi, membuat rekomendasi pembelian, lalu memonitor hasilnya dari dashboard.',
    ctaTitle: 'Mulai dari landing, lanjut ke operasi nyata.',
    ctaText:
      'Masuk ke sistem untuk mengelola produk, gudang, forecasting, reorder, laporan, hingga AI assistant.',
    securityTitle: 'Siap untuk tim operasional',
    securityText:
      'Role-based access, audit trail, laporan ekspor, dan modul multi-gudang menjaga proses tetap terkendali.',
  },
  en: {
    badge: 'Inventory intelligence platform',
    eyebrow: 'Forecasting, reorder, and stock control in one system.',
    headline: 'PantauStok AI',
    subline:
      'A modern inventory system for reading demand, keeping stock healthy, coordinating warehouses, and recommending action before issues surface.',
    primary: 'Enter Dashboard',
    secondary: 'Explore Features',
    navFeatures: 'Features',
    navWorkflow: 'Workflow',
    navSecurity: 'Security',
    navLogin: 'Login',
    openDashboard: 'Open Dashboard',
    liveSignal: 'Live signal',
    heroPanelTitle: 'Inventory Command Center',
    heroPanelSubtitle: 'Stock movements, demand forecast, and reorder priority',
    stockHealth: 'Stock health',
    forecast: '30-day forecast',
    reorder: 'Reorder priority',
    aiNarrative: 'AI narrative',
    aiText: 'Out-of-stock risk dropped after automated reorder was scheduled for 8 high-velocity SKUs.',
    featuresTitle: 'Built for fast, precise stock decisions',
    featuresSubline:
      'Core modules are made for inventory operations: not just records, but signals, action, and auditability.',
    workflowTitle: 'From raw data to operational action',
    workflowSubline:
      'Teams can scan products, inspect forecasts, create reorder recommendations, and monitor outcomes from the dashboard.',
    ctaTitle: 'Start from the landing page, continue into real operations.',
    ctaText:
      'Enter the system to manage products, warehouses, forecasting, reorder, reports, and the AI assistant.',
    securityTitle: 'Ready for operational teams',
    securityText:
      'Role-based access, audit trail, export reports, and multi-warehouse modules keep every process controlled.',
  },
};

const stats = [
  { value: '97%', label: 'forecast confidence' },
  { value: '8 SKU', label: 'reorder urgent' },
  { value: '3.4x', label: 'turnover signal' },
  { value: '24/7', label: 'monitoring' },
];

const featureCards = [
  {
    icon: BrainCircuit,
    title: 'AI Intelligence',
    text: 'Insight otomatis untuk membaca pola demand, risiko stok kosong, dan rekomendasi prioritas.',
    tone: 'violet',
  },
  {
    icon: LineChart,
    title: 'Demand Forecasting',
    text: 'Prediksi tren stok dengan visual chart yang membantu planning pembelian lebih awal.',
    tone: 'cyan',
  },
  {
    icon: Warehouse,
    title: 'Multi Warehouse',
    text: 'Pantau stok antar gudang, transfer barang, dan lihat inventory value secara terkonsolidasi.',
    tone: 'emerald',
  },
  {
    icon: ScanLine,
    title: 'Barcode Scanner',
    text: 'Percepat stock-in, stock-out, dan opname dengan flow scan yang langsung masuk ke sistem.',
    tone: 'amber',
  },
  {
    icon: Store,
    title: 'E-Commerce Sync',
    text: 'Sinkronkan pesanan dan stok marketplace agar selling channel tetap terkontrol.',
    tone: 'rose',
  },
  {
    icon: CalendarDays,
    title: 'Inventory Calendar',
    text: 'Jadwalkan kedatangan PO, cycle count, dan expiry tracking dalam satu tampilan.',
    tone: 'blue',
  },
];

const workflow = [
  { icon: Boxes, title: 'Collect', text: 'Produk, supplier, movement, order, dan opname masuk ke satu sumber data.' },
  { icon: Radar, title: 'Detect', text: 'Anomaly detector dan alert engine membaca stok rendah serta demand spike.' },
  { icon: Zap, title: 'Act', text: 'Smart reorder, laporan, dan AI assistant membantu tim mengambil tindakan.' },
];

const integrations = ['Tokopedia', 'Shopee', 'Shopify', 'POS', 'CSV Export', 'Barcode', 'Forecast API', 'Warehouse'];

function MiniLineChart() {
  return (
    <svg className="landing-chart" viewBox="0 0 360 140" role="img" aria-label="Forecast trend chart">
      <defs>
        <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="landing-chart__area"
        d="M0 110 C36 92 50 102 78 76 C112 44 138 66 168 58 C205 48 222 20 252 36 C292 58 312 28 360 18 L360 140 L0 140 Z"
      />
      <path
        className="landing-chart__line"
        d="M0 110 C36 92 50 102 78 76 C112 44 138 66 168 58 C205 48 222 20 252 36 C292 58 312 28 360 18"
      />
      <path
        className="landing-chart__line landing-chart__line--ghost"
        d="M0 90 C34 80 58 82 86 66 C124 44 140 76 174 74 C210 70 226 48 258 54 C294 62 326 42 360 52"
      />
    </svg>
  );
}

function DashboardVisual({ text }) {
  const bars = [72, 46, 84, 60, 92, 68, 78];

  return (
    <div className="landing-visual" aria-label={text.heroPanelTitle}>
      <div className="landing-visual__topbar">
        <span />
        <span />
        <span />
        <div className="landing-visual__search">{text.liveSignal}</div>
      </div>

      <div className="landing-visual__header">
        <div>
          <p>{text.heroPanelTitle}</p>
          <span>{text.heroPanelSubtitle}</span>
        </div>
        <div className="landing-visual__status">
          <Activity size={15} />
          Online
        </div>
      </div>

      <div className="landing-visual__metrics">
        <div className="landing-metric landing-metric--green">
          <span>{text.stockHealth}</span>
          <strong>92%</strong>
        </div>
        <div className="landing-metric landing-metric--cyan">
          <span>{text.forecast}</span>
          <strong>+18%</strong>
        </div>
        <div className="landing-metric landing-metric--amber">
          <span>{text.reorder}</span>
          <strong>8</strong>
        </div>
      </div>

      <div className="landing-visual__main">
        <div className="landing-panel landing-panel--chart">
          <div className="landing-panel__heading">
            <span>Demand Trend</span>
            <TrendingUp size={16} />
          </div>
          <MiniLineChart />
        </div>
        <div className="landing-panel landing-panel--bars">
          <div className="landing-panel__heading">
            <span>Category Flow</span>
            <BarChart3 size={16} />
          </div>
          <div className="landing-bars">
            {bars.map((height, index) => (
              <span key={height + index} style={{ '--bar-height': `${height}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="landing-ai-note">
        <div className="landing-ai-note__icon">
          <Sparkles size={17} />
        </div>
        <div>
          <span>{text.aiNarrative}</span>
          <p>{text.aiText}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature }) {
  const Icon = feature.icon;

  return (
    <article className={`landing-feature landing-feature--${feature.tone}`}>
      <div className="landing-feature__icon">
        <Icon size={21} />
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.text}</p>
    </article>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { lang, toggleLang } = useI18n();
  const text = COPY[lang] || COPY.id;
  const primaryTarget = isAuthenticated ? '/dashboard' : '/login';
  const primaryLabel = isAuthenticated ? text.openDashboard : text.primary;

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-nav__brand" to="/" aria-label="PantauStok AI home">
          <img src="/logo.png" alt="" />
          <span>PantauStok AI</span>
        </Link>

        <nav className="landing-nav__links" aria-label="Landing page navigation">
          <a href="#features">{text.navFeatures}</a>
          <a href="#workflow">{text.navWorkflow}</a>
          <a href="#security">{text.navSecurity}</a>
        </nav>

        <div className="landing-nav__actions">
          <button className="landing-icon-btn" onClick={toggleLang} title="Language">
            <Globe size={16} />
            <span>{lang.toUpperCase()}</span>
          </button>
          <Link className="landing-nav__login" to={primaryTarget}>
            <LogIn size={16} />
            <span>{isAuthenticated ? text.openDashboard : text.navLogin}</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__scene" aria-hidden="true">
            <div className="landing-hero__grid" />
            <div className="landing-hero__scan landing-hero__scan--one" />
            <div className="landing-hero__scan landing-hero__scan--two" />
          </div>

          <div className="landing-hero__inner">
            <div className="landing-hero__copy">
              <div className="landing-pill">
                <BadgeCheck size={16} />
                <span>{text.badge}</span>
              </div>
              <h1>{text.headline}</h1>
              <p className="landing-hero__eyebrow">{text.eyebrow}</p>
              <p className="landing-hero__subline">{text.subline}</p>
              <div className="landing-hero__actions">
                <Link className="landing-button landing-button--primary" to={primaryTarget}>
                  <PackageCheck size={18} />
                  <span>{primaryLabel}</span>
                  <ArrowRight size={18} />
                </Link>
                <a className="landing-button landing-button--secondary" href="#features">
                  <Sparkles size={18} />
                  <span>{text.secondary}</span>
                </a>
              </div>
            </div>

            <DashboardVisual text={text} />
          </div>
        </section>

        <section className="landing-stats" aria-label="Platform metrics">
          {stats.map((stat) => (
            <div key={stat.label} className="landing-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section__header">
            <span className="landing-section__kicker">Feature Stack</span>
            <h2>{text.featuresTitle}</h2>
            <p>{text.featuresSubline}</p>
          </div>

          <div className="landing-features">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </section>

        <section className="landing-marquee" aria-label="Supported workflows">
          <div className="landing-marquee__track">
            {[...integrations, ...integrations].map((item, index) => (
              <span key={`${item}-${index}`}>
                <Layers3 size={15} />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section id="workflow" className="landing-section landing-section--workflow">
          <div className="landing-section__header">
            <span className="landing-section__kicker">Operational Flow</span>
            <h2>{text.workflowTitle}</h2>
            <p>{text.workflowSubline}</p>
          </div>

          <div className="landing-workflow">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="landing-workflow__item">
                  <div className="landing-workflow__step">0{index + 1}</div>
                  <div className="landing-workflow__icon">
                    <Icon size={22} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  {index < workflow.length - 1 && <ChevronRight className="landing-workflow__arrow" size={22} />}
                </article>
              );
            })}
          </div>
        </section>

        <section id="security" className="landing-security">
          <div className="landing-security__content">
            <div className="landing-security__icon">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="landing-section__kicker">Access Control</span>
              <h2>{text.securityTitle}</h2>
              <p>{text.securityText}</p>
            </div>
          </div>
          <div className="landing-security__checks">
            <span><BadgeCheck size={16} /> Staff, Manager, Admin</span>
            <span><Clock3 size={16} /> Audit trail</span>
            <span><PackageCheck size={16} /> Export laporan</span>
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <span className="landing-section__kicker">Ready</span>
            <h2>{text.ctaTitle}</h2>
            <p>{text.ctaText}</p>
          </div>
          <Link className="landing-button landing-button--primary" to={primaryTarget}>
            <PackageCheck size={18} />
            <span>{primaryLabel}</span>
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    </div>
  );
}
