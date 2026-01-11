import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Units from "./pages/Units.jsx";
import Tenants from "./pages/Tenants.jsx";
import Leases from "./pages/Leases.jsx";
import Invoices from "./pages/Invoices.jsx";
import Payments from "./pages/Payments.jsx";
import MonthlySummary from "./pages/MonthlySummary.jsx";

import "./styles.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/units" element={<Units />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/summary" element={<MonthlySummary />} />

        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
