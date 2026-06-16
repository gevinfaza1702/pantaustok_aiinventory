import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Core APIs ────────────────────────────────────────────
export const dashboardAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getInsights:  () => api.get('/analytics/insights'),
};

export const productsAPI = {
  getAll:  (params) => api.get('/products', { params }),
  getById: (id)     => api.get(`/products/${id}`),
  create:  (data)   => api.post('/products', data),
  update:  (id, data) => api.put(`/products/${id}`, data),
  delete:  (id)     => api.delete(`/products/${id}`),
};

export const suppliersAPI = {
  getAll:  (params) => api.get('/suppliers', { params }),
  getById: (id)     => api.get(`/suppliers/${id}`),
  create:  (data)   => api.post('/suppliers', data),
  update:  (id, data) => api.put(`/suppliers/${id}`, data),
  delete:  (id)     => api.delete(`/suppliers/${id}`),
};

export const movementsAPI = {
  getAll:          (params)             => api.get('/movements', { params }),
  getByProductId:  (productId, params)  => api.get(`/movements/product/${productId}`, { params }),
  record:          (data)               => api.post('/movements', data),
  bulkImport:      (formData)           => api.post('/movements/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const forecastAPI = {
  getForecast:      (productId)       => api.get(`/forecast/${productId}`),
  generateForecast: (productId, days) => api.post(`/forecast/${productId}?days=${days}`),
  getAccuracy:      (productId)       => api.get(`/forecast/${productId}/accuracy`),
};

export const alertsAPI = {
  getActive:   (params) => api.get('/alerts', { params }),
  markAsRead:  (id)     => api.put(`/alerts/${id}/read`),
  getRules:    ()       => api.get('/alerts/rules'),
};

// ─── New Feature APIs ─────────────────────────────────────

export const reorderAPI = {
  getSuggestions: ()           => api.get('/reorder/suggestions'),
  getOrders:      ()           => api.get('/reorder/orders'),
  placeOrder:     (params)     => api.post('/reorder/orders', null, { params }),
  updateStatus:   (id, status) => api.put(`/reorder/orders/${id}/status?status=${status}`),
};

export const intelligenceAPI = {
  getABC:               ()         => api.get('/intelligence/abc'),
  getDeadStock:         (days=30)  => api.get(`/intelligence/dead-stock?days=${days}`),
  getSupplierPerf:      ()         => api.get('/intelligence/supplier-performance'),
};

export const aiAPI = {
  getAnomalies:        ()              => api.get('/ai/anomalies'),
  getAnomalyNarrative: (lang = 'id')  => api.get(`/ai/anomalies/narrative?lang=${lang}`),
  queryInventory:      (question, lang = 'id') => api.post('/ai/query', { question, lang }),
};

export const exportAPI = {
  downloadInventory:  () => `${api.defaults.baseURL}/export/inventory.csv`,
  downloadMovements:  (days=30) => `${api.defaults.baseURL}/export/movements.csv?days=${days}`,
  downloadSuppliers:  () => `${api.defaults.baseURL}/export/suppliers.csv`,
};

export const auditAPI = {
  getLogs: (params) => api.get('/audit/logs', { params }),
};

export default api;
