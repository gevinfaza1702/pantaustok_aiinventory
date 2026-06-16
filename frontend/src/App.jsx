import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import Login        from './pages/Login';
import Landing      from './pages/Landing';

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

// Mega Feature Pages
import ProfitLoss   from './pages/ProfitLoss';
import Warehouses   from './pages/Warehouses';
import Scanner      from './pages/Scanner';
import Calendar     from './pages/Calendar';
import StockOpname  from './pages/StockOpname';
import Ecommerce    from './pages/Ecommerce';
import './styles/ui-polish.css';

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Protected app shell */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Core */}
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="products"         element={<Products />} />
        <Route path="products/:id"     element={<ProductDetail />} />
        <Route path="suppliers"        element={<Suppliers />} />
        <Route path="movements"        element={<StockMovements />} />
        <Route path="forecasting"      element={<Forecasting />} />
        <Route path="alerts"           element={<Alerts />} />

        {/* Intelligence */}
        <Route path="reorder"          element={<Reorder />} />
        <Route path="intelligence"     element={<Intelligence />} />
        <Route path="ai"               element={<AIAssistant />} />
        <Route path="profit-loss"      element={<ProfitLoss />} />

        {/* Operations */}
        <Route path="scanner"          element={<Scanner />} />
        <Route path="calendar"         element={<Calendar />} />
        <Route path="stock-opname"     element={<StockOpname />} />
        <Route
          path="warehouses"
          element={<ProtectedRoute minRole="manager"><Warehouses /></ProtectedRoute>}
        />

        {/* Admin */}
        <Route path="reports"          element={<Reports />} />
        <Route
          path="ecommerce"
          element={<ProtectedRoute minRole="manager"><Ecommerce /></ProtectedRoute>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
