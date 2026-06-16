import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { PackagePlus, X, Loader2 } from 'lucide-react';
import './Products.css';

const EMPTY_FORM = {
  name: '', sku: '', category: '',
  unit: 'pcs', current_stock: '', min_stock: '', max_stock: '',
  cost_price: '', sell_price: '', status: 'active', description: '',
};

const CATEGORIES = ['Electronics', 'Food & Beverage', 'Office Supplies', 'Raw Materials', 'Packaging'];
const UNITS      = ['pcs', 'kg', 'box', 'pack', 'liter', 'meter', 'set', 'unit'];

export default function Products() {
  const { products, loading, error, fetchProducts, createProduct } = useProducts();
  const navigate = useNavigate();

  // Filters
  const [searchTerm,    setSearchTerm   ] = useState('');
  const [categoryFilter,setCategoryFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm      ] = useState(EMPTY_FORM);
  const [saving,    setSaving    ] = useState(false);
  const [formError, setFormError ] = useState('');
  const firstInputRef = useRef(null);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Focus first field when modal opens
  useEffect(() => {
    if (showModal) setTimeout(() => firstInputRef.current?.focus(), 60);
  }, [showModal]);

  const openModal  = () => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Basic validation
    if (!form.name.trim())     return setFormError('Product name is required.');
    if (!form.sku.trim())      return setFormError('SKU is required.');
    if (!form.category)        return setFormError('Category is required.');
    if (form.current_stock === '') return setFormError('Current stock is required.');

    const payload = {
      ...form,
      current_stock: Number(form.current_stock),
      min_stock:     Number(form.min_stock    || 0),
      max_stock:     form.max_stock ? Number(form.max_stock) : null,
      cost_price:    form.cost_price  ? Number(form.cost_price)  : 0,
      sell_price:    form.sell_price  ? Number(form.sell_price)  : 0,
    };

    setSaving(true);
    const result = await createProduct(payload);
    setSaving(false);

    if (result.success) {
      closeModal();
    } else {
      setFormError(result.error || 'Failed to create product. Please try again.');
    }
  };

  // Filtered list
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat    = categoryFilter ? p.category === categoryFilter : true;
    return matchSearch && matchCat;
  });

  const columns = [
    { header: 'SKU', accessor: 'sku', width: '120px' },
    {
      header: 'Product',
      accessor: 'name',
      cell: (row) => (
        <div className="product-cell">
          <span className="product-cell__name">{row.name}</span>
          <span className="product-cell__cat">{row.category}</span>
        </div>
      ),
    },
    {
      header: 'Stock Level',
      accessor: 'current_stock',
      cell: (row) => {
        let status = 'healthy';
        if (row.current_stock === 0)             status = 'out';
        else if (row.current_stock <= row.min_stock) status = 'critical';
        return (
          <div className="stock-cell">
            <span className={`stock-cell__value ${status === 'out' ? 'text-danger' : ''}`}>
              {formatNumber(row.current_stock)} <span className="text-tertiary text-xs ml-1">{row.unit}</span>
            </span>
            <div className="stock-cell__bar-bg">
              <div
                className={`stock-cell__bar-fill bg-${status === 'healthy' ? 'success' : status === 'critical' ? 'warning' : 'danger'}`}
                style={{ width: `${Math.min(100, (row.current_stock / Math.max(1, row.max_stock || 100)) * 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    { header: 'Price', accessor: 'sell_price', cell: (row) => formatCurrency(row.sell_price) },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <Badge type={row.status} text={row.status.replace('_', ' ')} />,
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header__actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search SKU or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button className="btn btn-primary" onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackagePlus size={16} /> Add Product
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-danger p-4">{error}</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredProducts}
          isLoading={loading}
          onRowClick={(row) => navigate(`/products/${row.id}`)}
        />
      )}

      {/* ── Add Product Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Add Product">

            {/* Header */}
            <div className="modal__header">
              <h2 className="modal__title">Add New Product</h2>
              <button className="modal__close" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="modal__body">
              {formError && (
                <div className="modal__error">{formError}</div>
              )}

              <div className="form-grid">
                {/* Name */}
                <div className="form-group form-group--span2">
                  <label className="form-label">Product Name <span className="req">*</span></label>
                  <input
                    ref={firstInputRef}
                    name="name" value={form.name} onChange={handleChange}
                    placeholder="e.g. Laptop Samsung Galaxy Book"
                    className="form-input"
                  />
                </div>

                {/* SKU */}
                <div className="form-group">
                  <label className="form-label">SKU <span className="req">*</span></label>
                  <input
                    name="sku" value={form.sku} onChange={handleChange}
                    placeholder="e.g. SKU-ELE-0001"
                    className="form-input"
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category <span className="req">*</span></label>
                  <select name="category" value={form.category} onChange={handleChange} className="form-input">
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Unit */}
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select name="unit" value={form.unit} onChange={handleChange} className="form-input">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="form-input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>

                {/* Stock fields */}
                <div className="form-group">
                  <label className="form-label">Current Stock <span className="req">*</span></label>
                  <input
                    type="number" min="0" name="current_stock" value={form.current_stock}
                    onChange={handleChange} placeholder="0" className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Min Stock</label>
                  <input
                    type="number" min="0" name="min_stock" value={form.min_stock}
                    onChange={handleChange} placeholder="0" className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Stock</label>
                  <input
                    type="number" min="0" name="max_stock" value={form.max_stock}
                    onChange={handleChange} placeholder="Optional" className="form-input"
                  />
                </div>

                {/* Pricing */}
                <div className="form-group">
                  <label className="form-label">Cost Price (Rp)</label>
                  <input
                    type="number" min="0" name="cost_price" value={form.cost_price}
                    onChange={handleChange} placeholder="0" className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sell Price (Rp)</label>
                  <input
                    type="number" min="0" name="sell_price" value={form.sell_price}
                    onChange={handleChange} placeholder="0" className="form-input"
                  />
                </div>

                {/* Description */}
                <div className="form-group form-group--span2">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description" value={form.description} onChange={handleChange}
                    placeholder="Optional product description..."
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="modal__footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><PackagePlus size={14} /> Add Product</>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
