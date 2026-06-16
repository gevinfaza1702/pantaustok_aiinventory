import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth interceptor ─────────────────────────────────────
// Attach the JWT from localStorage to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ps_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the session and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('ps_token');
      localStorage.removeItem('ps_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth APIs ────────────────────────────────────────────
export const authAPI = {
  login: (username, password) => {
    // OAuth2 password flow expects form-urlencoded body
    const body = new URLSearchParams({ username, password });
    return api.post('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  me:       ()     => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
  listUsers:()     => api.get('/auth/users'),
};

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
  receive:        (id, data)   => api.put(`/reorder/orders/${id}/receive`, data),
  getTimeline:    (id)         => api.get(`/reorder/orders/${id}/timeline`),
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

// ─── Mega Feature APIs ────────────────────────────────────

export const pnlAPI = {
  getOverview:   ()       => api.get('/pnl/overview'),
  getByProduct:  ()       => api.get('/pnl/by-product'),
  getByCategory: ()       => api.get('/pnl/by-category'),
  getTrend:      (period='daily') => api.get(`/pnl/trend?period=${period}`),
  getHeatmap:    ()       => api.get('/pnl/heatmap'),
};

export const warehouseAPI = {
  getAll:        ()       => api.get('/warehouses'),
  create:        (data)   => api.post('/warehouses', data),
  getStock:      (id)     => api.get(`/warehouses/${id}/stock`),
  transfer:      (data)   => api.post('/warehouses/transfer', data),
  getConsolidated: ()     => api.get('/warehouses/consolidated'),
};

export const barcodeAPI = {
  lookupBySku:   (sku)    => api.get(`/products/by-sku/${encodeURIComponent(sku)}`),
  qrLabelUrl:    (id)     => `${api.defaults.baseURL}/products/${id}/qr-label`,
};

export const calendarAPI = {
  getEvents:     (start, end) => api.get('/calendar/events', { params: { start, end } }),
};

export const stockOpnameAPI = {
  list:          ()       => api.get('/stock-opname'),
  create:        (data)   => api.post('/stock-opname', data),
  getById:       (id)     => api.get(`/stock-opname/${id}`),
  recordCounts:  (id, items) => api.put(`/stock-opname/${id}/items`, { items }),
  approve:       (id)     => api.post(`/stock-opname/${id}/approve`),
};

export const dashboardLayoutAPI = {
  getLayouts:    ()       => api.get('/dashboard/layouts'),
  saveLayout:    (data)   => api.post('/dashboard/layouts', data),
  updateLayout:  (id, data) => api.put(`/dashboard/layouts/${id}`, data),
};

export const ecommerceAPI = {
  getChannels:   ()       => api.get('/ecommerce/channels'),
  createChannel: (data)   => api.post('/ecommerce/channels', data),
  sync:          (id)     => api.post(`/ecommerce/channels/${id}/sync`),
  getOrders:     ()       => api.get('/ecommerce/orders'),
};

export const reportsAPI = {
  getSchedules:  ()       => api.get('/reports/schedules'),
  createSchedule:(data)   => api.post('/reports/schedules', data),
  deleteSchedule:(id)     => api.delete(`/reports/schedules/${id}`),
  generate:      (data)   => api.post('/reports/generate', data, { responseType: 'blob' }),
};

export default api;
