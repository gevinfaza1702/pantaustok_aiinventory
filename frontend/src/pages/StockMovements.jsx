import { useState, useEffect } from 'react';
import { movementsAPI, productsAPI } from '../services/api';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { formatDate } from '../utils/formatters';
import { ArrowLeftRight, Plus } from 'lucide-react';

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [productsCache, setProductsCache] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in',
    quantity: 1,
    reference: '',
    notes: ''
  });

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await movementsAPI.getAll({ limit: 100 });
      setMovements(res.data);
    } catch (err) {
      console.error("Failed to load movements", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsForSelect = async () => {
    try {
      const res = await productsAPI.getAll({ limit: 500 }); // Quick load for dropdown
      setProductsCache(res.data);
      if (res.data.length > 0 && !formData.product_id) {
        setFormData(prev => ({ ...prev, product_id: res.data[0].id }));
      }
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchProductsForSelect();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitLoading(true);
      
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity, 10)
      };
      
      await movementsAPI.record(payload);
      
      setIsModalOpen(false);
      fetchMovements(); // Refresh list
      
      // Reset form
      setFormData({
        product_id: productsCache[0]?.id || '',
        movement_type: 'in',
        quantity: 1,
        reference: '',
        notes: ''
      });
      
    } catch(err) {
      alert("Failed to record movement: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    { header: 'Date', accessor: 'created_at', cell: r => formatDate(r.created_at, true) },
    { 
      header: 'Product', 
      accessor: 'product_name',
      cell: r => <span className="font-semibold">{r.product_name}</span>
    },
    { header: 'Type', accessor: 'movement_type', cell: r => <Badge type={r.movement_type} text={r.movement_type} /> },
    { 
      header: 'Quantity', 
      accessor: 'quantity', 
      cell: r => (
        <span className={`font-bold ${r.quantity > 0 ? 'text-success' : 'text-danger'}`}>
          {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
        </span>
      )
    },
    { header: 'Reference', accessor: 'reference', cell: r => r.reference || '-' },
    { header: 'Author', accessor: 'created_by', cell: r => <span className="text-secondary text-sm">{r.created_by}</span> }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="text-accent" />
          <h1 className="text-xl font-bold text-primary m-0">Stock Movements</h1>
        </div>
        
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} />
          Record Movement
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={movements} 
        isLoading={loading}
      />

      {/* Record Movement Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Record Stock Movement"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1">
            <label className="text-sm text-secondary font-medium">Product *</label>
            <select 
              required
              value={formData.product_id}
              onChange={e => setFormData({...formData, product_id: e.target.value})}
            >
              <option value="" disabled>Select a product...</option>
              {productsCache.map(p => (
                <option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock: {p.current_stock})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm text-secondary font-medium">Movement Type *</label>
              <select 
                required
                value={formData.movement_type}
                onChange={e => setFormData({...formData, movement_type: e.target.value})}
              >
                <option value="in">In (Receive Stock)</option>
                <option value="out">Out (Fulfill/Sell)</option>
                <option value="adjustment">Adjustment (Audit/Damage)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm text-secondary font-medium">Quantity *</label>
              <input 
                type="number" 
                required 
                min="1"
                placeholder="e.g. 50"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
              <span className="text-xs text-tertiary">Amount always positive here.</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-secondary font-medium">Reference Code</label>
            <input 
              type="text" 
              placeholder="e.g. PO-1234 or SO-9999"
              value={formData.reference}
              onChange={e => setFormData({...formData, reference: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-secondary font-medium">Notes</label>
            <textarea 
              rows="2"
              placeholder="Optional notes about this movement"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          <div className="modal-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitLoading || !formData.product_id}>
              {submitLoading ? 'Saving...' : 'Confirm Movement'}
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
}
