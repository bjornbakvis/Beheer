import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Overview from './Overview';
import Dynamiekregels from './Dynamiekregels';
import DynamiekregelDetail from './DynamiekregelDetail';
import RuleDetail from './RuleDetail';
import Products from './Products';
import ProductRules from './ProductRules';
import ProductDynamiekregels from './ProductDynamiekregels';
import AuthGate from './AuthGate';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/acceptatieregels" element={<App />} />

          <Route path="/dynamiekregels" element={<Dynamiekregels />} />
          <Route path="/dynamiekregels/:regelId" element={<DynamiekregelDetail />} />

          <Route path="/producten" element={<Products />} />
          <Route path="/producten/:productId/regels" element={<ProductRules />} />
          <Route path="/producten/:productId/dynamiekregels" element={<ProductDynamiekregels />} />

          <Route path="/rules/:regelId" element={<RuleDetail />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);
