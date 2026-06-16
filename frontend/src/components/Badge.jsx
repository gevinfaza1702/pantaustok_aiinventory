import './Badge.css';

export default function Badge({ type = 'neutral', text }) {
  // Map types to corresponding colors defined in index.css
  const getColorClass = () => {
    switch (type.toLowerCase()) {
      case 'active':
      case 'in':
      case 'success':
      case 'healthy':
        return 'badge--success';
      case 'discontinued':
      case 'inactive':
      case 'out':
      case 'critical':
      case 'error':
      case 'danger':
        return 'badge--danger';
      case 'low_stock':
      case 'warning':
      case 'low':
      case 'adjustment':
      case 'anomaly':
        return 'badge--warning';
      case 'overstock':
      case 'info':
        return 'badge--info';
      default:
        return 'badge--neutral';
    }
  };

  return (
    <span className={`badge ${getColorClass()}`}>
      {text}
    </span>
  );
}
