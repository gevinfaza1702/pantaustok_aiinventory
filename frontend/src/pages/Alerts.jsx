import { useEffect, useState } from 'react';
import { alertsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import Badge from '../components/Badge';
import { Bell, CheckSquare, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('unread'); // 'all', 'unread'

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const isReadParam = filter === 'unread' ? false : undefined;
      const res = await alertsAPI.getActive({ is_read: isReadParam });
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const handleMarkRead = async (id) => {
    try {
      await alertsAPI.markAsRead(id);
      fetchAlerts(); // Refresh list
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertOctagon className="text-danger" size={24} />;
      case 'warning': return <AlertTriangle className="text-warning" size={24} />;
      default: return <Info className="text-info" size={24} />;
    }
  };

  return (
    <div className="page-container max-w-4xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Bell className="text-accent" />
          <h1 className="text-xl font-bold text-primary m-0">Alert Center</h1>
        </div>
        
        <div className="flex gap-2">
          <button 
            className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Alerts
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="p-8 text-center text-secondary">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-secondary border border-dashed border-border rounded-xl p-12 text-center flex flex-col items-center">
            <CheckSquare size={48} className="text-success opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-primary mb-1">All Caught Up!</h3>
            <p className="text-secondary">There are no {filter === 'unread' ? 'unread ' : ''}alerts requiring your attention.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              className={`bg-secondary border rounded-xl p-5 flex gap-4 items-start transition-colors ${
                !alert.is_read ? 'border-l-4 border-l-accent border-y-border border-r-border shadow-sm' : 'border-border opacity-70'
              }`}
            >
              <div className="mt-1">
                {getSeverityIcon(alert.severity)}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <Badge type={alert.alert_type} text={alert.alert_type.replace('_', ' ')} />
                    <span className="text-secondary text-xs">{formatDate(alert.created_at, true)}</span>
                  </div>
                  
                  {!alert.is_read && (
                    <button 
                      onClick={() => handleMarkRead(alert.id)}
                      className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1"
                    >
                      <CheckSquare size={14} />
                      Mark Read
                    </button>
                  )}
                </div>
                
                <p className="text-primary text-sm leading-relaxed">{alert.message}</p>
                
                {alert.product_id && (
                  <div className="mt-3">
                    <a href={`/products/${alert.product_id}`} className="text-xs text-accent hover:underline">
                      View Product Details &rarr;
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
