// src/pages/Invoices.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useSearchParams } from "react-router-dom";

function currentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ✅ Soles formatter (Perú)
const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});
const money = (n) => PEN.format(Number(n || 0));

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = useState(
    searchParams.get("period") || currentPeriod()
  );
  const [status, setStatus] = useState(searchParams.get("status") || "");

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const p = searchParams.get("period");
    const s = searchParams.get("status");

    if (p !== null && p !== period) setPeriod(p);
    if (s !== null && s !== status) setStatus(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (period) sp.set("period", period);
    if (status) sp.set("status", status);
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, status]);

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (period) qs.set("period", period);
    if (status) qs.set("status", status);
    return `?${qs.toString()}`;
  }, [period, status]);

  const load = async () => {
    setErr("");
    setMsg("");
    try {
      setItems(await api.get(`/invoices${query}`));
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const generateForPeriod = async () => {
    setErr("");
    setMsg("");
    try {
      await api.post(`/invoices/generate?period=${period}`, {});
      setMsg(`Invoices generated for ${period} ✅`);
      await load();
    } catch (e) {
      setErr(e.message);
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

        <button onClick={generateForPeriod}>Generate for period</button>
      </div>

      {err && <div className="error">{err}</div>}
      {msg && <div className="ok">{msg}</div>}

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
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.id}</td>

              {/* ✅ LeaseId + Tenant name */}
              <td>
                {i.leaseId}
                {i.lease?.tenant?.name ? ` — ${i.lease.tenant.name}` : ""}

              </td>

              <td>{i.period}</td>
              <td>{new Date(i.dueDate).toLocaleDateString("es-PE")}</td>
              <td>{money(i.amount)}</td>
              <td>{money(i.balance)}</td>
              <td>{i.status}</td>
            </tr>
          ))}

          {items.length === 0 && (
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
