/**
 * AI Assistant Page
 * Combines anomaly detection + natural language inventory query.
 * Language selector: ID / EN
 */

import { useEffect, useState, useRef } from 'react';
import { aiAPI } from '../services/api';
import { Sparkles, Loader2, Send, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import './AIAssistant.css';

const LANG_LABELS = {
  id: { placeholder: 'Tanyakan tentang inventori Anda...', greeting: 'Halo! Saya PantauStok AI. Tanyakan apa saja tentang inventori Anda — seperti "Produk mana yang akan habis minggu ini?" atau "Stok apa yang paling bernilai?"', errorMsg: '⚠️ Tidak dapat menjangkau layanan AI. Silakan coba lagi.' },
  en: { placeholder: 'Ask about your inventory...', greeting: "Hello! I'm PantauStok AI. Ask me anything about your inventory — like 'Which products will run out this week?' or 'What\'s our most valuable stock?'", errorMsg: '⚠️ Could not reach the AI service. Please try again.' },
};

export default function AIAssistant() {
  const [lang, setLang]                 = useState('id');
  const [anomalies, setAnomalies]       = useState([]);
  const [narrative, setNarrative]       = useState('');
  const [loadingAnomaly, setLoadingAnomaly] = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(false);

  const [messages, setMessages] = useState([
    { role: 'assistant', text: LANG_LABELS['id'].greeting },
  ]);
  const [input, setInput]       = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef              = useRef(null);

  // Update greeting when language changes
  const prevLang = useRef(lang);
  useEffect(() => {
    if (prevLang.current !== lang) {
      prevLang.current = lang;
      setMessages([{ role: 'assistant', text: LANG_LABELS[lang].greeting }]);
      setNarrative('');
    }
  }, [lang]);

  // Fetch anomalies on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await aiAPI.getAnomalies();
        setAnomalies(r.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAnomaly(false);
      }
    })();
  }, []);

  const fetchNarrative = async () => {
    setLoadingNarrative(true);
    try {
      const r = await aiAPI.getAnomalyNarrative(lang);
      setNarrative(r.data.narrative);
    } catch {
      setNarrative(lang === 'id'
        ? 'Gagal menghasilkan laporan. Silakan coba lagi.'
        : 'Failed to generate narrative. Please try again.'
      );
    } finally {
      setLoadingNarrative(false);
    }
  };

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || chatLoading) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setChatLoading(true);

    try {
      const r = await aiAPI.queryInventory(q, lang);
      setMessages(prev => [...prev, { role: 'assistant', text: r.data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: LANG_LABELS[lang].errorMsg }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sparkles size={22} className="text-accent" />
          <div>
            <h1>AI Intelligence Center</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
              Analisis inventori berbasis AI
            </p>
          </div>
        </div>

        {/* Global language toggle */}
        <div className="ai-lang-toggle">
          <button
            className={`ai-lang-btn ${lang === 'id' ? 'ai-lang-btn--active' : ''}`}
            onClick={() => setLang('id')}
          >🇮🇩 Indonesia</button>
          <button
            className={`ai-lang-btn ${lang === 'en' ? 'ai-lang-btn--active' : ''}`}
            onClick={() => setLang('en')}
          >🇬🇧 English</button>
        </div>
      </div>

      <div className="ai-layout">

        {/* Left: Anomaly Detection */}
        <div className="ai-anomaly-panel">
          <div className="ai-panel-header">
            <h2>{lang === 'id' ? 'Deteksi Anomali' : 'Anomaly Detection'}</h2>
            <span className="ai-panel-header__count">
              {loadingAnomaly ? '...' : `${anomalies.length} ${lang === 'id' ? 'ditemukan' : 'detected'}`}
            </span>
          </div>

          {loadingAnomaly ? (
            <div className="ai-loading">
              <Loader2 size={18} className="animate-spin" />
              {lang === 'id' ? 'Memindai inventori...' : 'Scanning inventory...'}
            </div>
          ) : anomalies.length === 0 ? (
            <div className="ai-anomaly-empty">
              <CheckCircle size={32} className="text-success" />
              <p>{lang === 'id' ? 'Semua aman — tidak ada anomali terdeteksi' : 'All clear — no anomalies detected'}</p>
            </div>
          ) : (
            <div className="ai-anomaly-list">
              {anomalies.map(a => (
                <div key={a.product_id} className={`ai-anomaly-item ai-anomaly-item--${a.primary_severity}`}>
                  <div className="ai-anomaly-item__top">
                    <AlertTriangle size={14} />
                    <span className="ai-anomaly-item__name">{a.name}</span>
                    <span className="ai-anomaly-item__sku">{a.sku}</span>
                  </div>
                  {a.issues.map((issue, i) => (
                    <p key={i} className="ai-anomaly-item__issue">{issue.message}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!loadingAnomaly && (
            <div className="ai-narrative-panel">
              {narrative ? (
                <p className="ai-narrative-text">{narrative}</p>
              ) : (
                <button
                  className="btn btn-primary w-full"
                  onClick={fetchNarrative}
                  disabled={loadingNarrative}
                >
                  {loadingNarrative
                    ? <><Loader2 size={14} className="animate-spin" /> {lang === 'id' ? 'Membuat laporan AI...' : 'Generating AI Report...'}</>
                    : <><Sparkles size={14} /> {lang === 'id' ? 'Buat Narasi AI' : 'Generate AI Narrative'}</>
                  }
                </button>
              )}
              {narrative && (
                <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={fetchNarrative}>
                  <RefreshCw size={13} /> {lang === 'id' ? 'Perbarui' : 'Refresh'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Chat */}
        <div className="ai-chat-panel">
          <div className="ai-panel-header">
            <h2>{lang === 'id' ? 'Tanya AI' : 'Ask AI'}</h2>
            <span className="ai-panel-header__count">
              {lang === 'id' ? 'Kueri Bahasa Alami' : 'Natural Language Query'}
            </span>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ai-msg__avatar"><Sparkles size={12} /></div>
                )}
                <div className="ai-msg__bubble">{msg.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div className="ai-msg ai-msg--assistant">
                <div className="ai-msg__avatar"><Sparkles size={12} /></div>
                <div className="ai-msg__bubble ai-msg__bubble--loading">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="ai-chat-input">
            <input
              type="text"
              placeholder={LANG_LABELS[lang].placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={chatLoading}
            />
            <button
              className="btn btn-primary"
              onClick={sendMessage}
              disabled={chatLoading || !input.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
