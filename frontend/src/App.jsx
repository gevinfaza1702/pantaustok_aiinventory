import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Core Pages
import Dashboard    from './pages/Dashboard';
import Products     from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Suppliers    from './pages/Suppliers';
import StockMovements from './pages/StockMovements';
import Forecasting  from './pages/Forecasting';
import Alerts       from './pages/Alerts';

// New Feature Pages
import Reports      from './pages/Reports';
import Reorder      from './pages/Reorder';
import Intelligence from './pages/Intelligence';
import AIAssistant  from './pages/AIAssistant';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Core */}
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="products"         element={<Products />} />
        <Route path="products/:id"     element={<ProductDetail />} />
        <Route path="suppliers"        element={<Suppliers />} />
        <Route path="movements"        element={<StockMovements />} />
        <Route path="forecasting"      element={<Forecasting />} />
        <Route path="alerts"           element={<Alerts />} />

        {/* New Features */}
        <Route path="reports"          element={<Reports />} />
        <Route path="reorder"          element={<Reorder />} />
        <Route path="intelligence"     element={<Intelligence />} />
        <Route path="ai"               element={<AIAssistant />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
