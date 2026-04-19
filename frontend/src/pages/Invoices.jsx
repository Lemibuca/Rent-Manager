// src/pages/Invoices.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api/client.js";
import { useSearchParams } from "react-router-dom";

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ✅ PEN currency formatter (Peru)
const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});
const formatMoney = (value) => PEN.format(Number(value || 0));

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = useState(searchParams.get("period") || getCurrentPeriod());
  const [status, setStatus] = useState(searchParams.get("status") || "");

  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Sync local state from URL query parameters
  useEffect(() => {
    const urlPeriod = searchParams.get("period");
    const urlStatus = searchParams.get("status");

    if (urlPeriod !== null && urlPeriod !== period) {
      setPeriod(urlPeriod);
    }
    if (urlStatus !== null && urlStatus !== status) {
      setStatus(urlStatus);
    }
  }, [searchParams, period, status]);

  // Sync URL query parameters from local state
  useEffect(() => {
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (status) params.set("status", status);
    setSearchParams(params, { replace: true });
  }, [period, status, setSearchParams]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (status) params.set("status", status);
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [period, status]);

  const loadInvoices = useCallback(async () => {
    setError("");
    setMessage("");
    try {
      const fetched = await api.get(`/invoices${queryString}`);
      setInvoices(fetched);
    } catch (e) {
      setError(e.message);
    }
  }, [queryString]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const generateInvoicesForPeriod = async () => {
    setError("");
    setMessage("");
    try {
      await api.post(`/invoices/generate?period=${period}`, {});
      setMessage(`Invoices generated for ${period} ✅`);
      await loadInvoices();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card">
      <h1>Invoices</h1>

      <div className="row">
        <div>
          <label className="muted">Period (YYYY-MM)</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>

        <div>
          <label className="muted">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
        </div>

        <button onClick={generateInvoicesForPeriod}>Generate for period</button>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="ok">{message}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Lease</th>
            <th>Period</th>
            <th>Due</th>
            <th>Amount</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.id}</td>
              <td>
                {invoice.leaseId}
                {invoice.lease?.tenant?.name ? ` — ${invoice.lease.tenant.name}` : ""}
              </td>
              <td>{invoice.period}</td>
              <td>{new Date(invoice.dueDate).toLocaleDateString("es-PE")}</td>
              <td>{formatMoney(invoice.amount)}</td>
              <td>{formatMoney(invoice.balance)}</td>
              <td>{invoice.status}</td>
            </tr>
          ))}

          {invoices.length === 0 && (
            <tr>
              <td colSpan="7" className="muted">
                No invoices.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}