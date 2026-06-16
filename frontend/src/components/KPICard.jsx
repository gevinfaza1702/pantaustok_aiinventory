import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import './KPICard.css';

export default function KPICard({ title, value, icon: Icon, trend, trendValue, color = 'accent' }) {
  
  const getTrendIcon = () => {
    if (trend === 'up')   return <ArrowUpRight size={14} />;
    if (trend === 'down') return <ArrowDownRight size={14} />;
    return <Minus size={14} />;
  };

  return (
    <div className="kpi-card">
      <div className={`kpi-card__icon-wrap kpi-card__icon-wrap--${color}`}>
        {Icon && <Icon size={20} />}
      </div>

      <div className="kpi-card__body">
        <p className="kpi-card__title">{title}</p>
        <div className="kpi-card__value">{value}</div>

        {trendValue && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`kpi-card__trend kpi-card__trend--${trend || 'neutral'}`}>
              {getTrendIcon()}
              {trendValue}
            </span>
            <span className="kpi-card__trend-label">vs last 30 days</span>
          </div>
        )}
      </div>
    </div>
  );
}
