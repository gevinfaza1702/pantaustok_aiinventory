import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { calendarAPI } from '../services/api';
import { useI18n } from '../i18n/i18n';
import './Calendar.css';

const TYPE_META = {
  movement:    { color: 'var(--info)',    labelKey: 'cal.movements' },
  po_arrival:  { color: 'var(--success)', labelKey: 'cal.poArrivals' },
  expiry:      { color: 'var(--danger)',  labelKey: 'cal.expiry' },
  cycle_count: { color: '#a855f7',        labelKey: 'cal.counts' },
};

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function ymd(d) { return d.toISOString().slice(0, 10); }

export default function Calendar() {
  const { t } = useI18n();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const { gridStart, gridEnd } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gs = new Date(first);
    gs.setDate(first.getDate() - first.getDay()); // back to Sunday
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const ge = new Date(last);
    ge.setDate(last.getDate() + (6 - last.getDay()));
    return { gridStart: gs, gridEnd: ge };
  }, [cursor]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    calendarAPI.getEvents(ymd(gridStart), ymd(gridEnd))
      .then((r) => { if (!cancelled) setEvents(r.data); })
      .catch((e) => console.error(e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gridStart, gridEnd]);

  // Group events by date
  const byDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      (map[ev.date] = map[ev.date] || []).push(ev);
    }
    return map;
  }, [events]);

  // Build the grid of days
  const days = useMemo(() => {
    const arr = [];
    const d = new Date(gridStart);
    while (d <= gridEnd) {
      arr.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const todayStr = ymd(new Date());
  const move = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="cal-heading">
          <CalendarDays size={22} className="cal-heading__icon" />
          <h1>{t('cal.title')}</h1>
        </div>
        <div className="cal-nav">
          <button className="btn btn-secondary" onClick={() => move(-1)}><ChevronLeft size={15} /></button>
          <span className="cal-nav__month">{MONTHS_ID[cursor.getMonth()]} {cursor.getFullYear()}</span>
          <button className="btn btn-secondary" onClick={() => move(1)}><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="cal-legend">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <span key={type} className="cal-legend__item">
            <span className="cal-legend__dot" style={{ background: meta.color }} />
            {t(meta.labelKey)}
          </span>
        ))}
      </div>

      <div className={`cal-grid-wrap ${loading ? 'cal-grid-wrap--loading' : ''}`}>
        <div className="cal-dow">
          {DOW.map((d) => <div key={d} className="cal-dow__cell">{d}</div>)}
        </div>
        <div className="cal-grid">
          {days.map((day) => {
            const ds = ymd(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const dayEvents = byDate[ds] || [];
            return (
              <button
                key={ds}
                className={`cal-cell ${inMonth ? '' : 'cal-cell--muted'} ${ds === todayStr ? 'cal-cell--today' : ''}`}
                onClick={() => dayEvents.length && setSelectedDay({ date: ds, events: dayEvents })}
              >
                <span className="cal-cell__num">{day.getDate()}</span>
                <div className="cal-cell__events">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id} className="cal-cell__event" style={{ background: TYPE_META[ev.type]?.color || 'var(--text-tertiary)' }}>
                      {ev.title}
                    </span>
                  ))}
                  {dayEvents.length > 3 && <span className="cal-cell__more">+{dayEvents.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <div className="cal-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal__header">
              <h2>{selectedDay.date}</h2>
              <button onClick={() => setSelectedDay(null)}><X size={18} /></button>
            </div>
            <div className="cal-modal__list">
              {selectedDay.events.map((ev) => (
                <div key={ev.id} className="cal-modal__item">
                  <span className="cal-modal__dot" style={{ background: TYPE_META[ev.type]?.color }} />
                  <div>
                    <p className="cal-modal__title">{ev.title}</p>
                    {ev.detail && <p className="cal-modal__detail">{ev.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
