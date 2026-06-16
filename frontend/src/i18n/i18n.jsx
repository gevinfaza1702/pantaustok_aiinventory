import { createContext, useContext, useState, useCallback } from 'react';
import id from './id';
import en from './en';

const DICTS = { id, en };
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ps_lang') || 'id');

  const changeLang = useCallback((next) => {
    setLang(next);
    localStorage.setItem('ps_lang', next);
  }, []);

  const toggleLang = useCallback(() => {
    changeLang(lang === 'id' ? 'en' : 'id');
  }, [lang, changeLang]);

  // Translate: falls back to the key itself so missing strings are visible.
  const t = useCallback(
    (key) => DICTS[lang]?.[key] ?? DICTS.id[key] ?? key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, t, changeLang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
