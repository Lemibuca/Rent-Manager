//frontend/src/pages/MonthlySummary.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

function currentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ✅ Soles formatter (PEN)
const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});
const money = (n) => PEN.format(Number(n || 0));

export default function MonthlySummary() {
  const [period, setPeriod] = useState(currentPeriod());
  const [view, setView] = useState("ALL"); // ALL | OWED | PAID | OVERDUE
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const res = await api.get(`/reports/monthly?period=${period}`);
      setData(res);
    } catch (e) {
      setErr(e.message);
      setData(null);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  const rows = useMemo(() => {
    if (!data?.items) return [];
    const items = data.items;

    if (view === "PAID") return items.filter((x) => x.balance === 0);
    if (view === "OWED") return items.filter((x) => x.balance > 0);
    if (view === "OVERDUE") return items.filter((x) => x.status === "OVERDUE" && x.balance > 0);
    return items;
  }, [data, view]);

  return (
    <div className="card">
      <h1>Monthly Summary</h1>
      <p className="muted">Resumen del mes: quién pagó y quién debe.</p>

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
          <label className="muted">View</label>
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="ALL">All</option>
            <option value="OWED">Owe (balance &gt; 0)</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>

        <button onClick={load}>Refresh</button>
      </div>

      {err && <div className="error">{err}</div>}

      {data?.totals && (
        <div className="grid">
          <div className="stat">
            <div className="label">Total billed</div>
            <div className="value">{money(data.totals.totalBilled)}</div>
          </div>
          <div className="stat">
            <div className="label">Total paid</div>
            <div className="value">{money(data.totals.totalPaid)}</div>
          </div>
          <div className="stat">
            <div className="label">Total balance</div>
            <div className="value">{money(data.totals.totalBalance)}</div>
          </div>
          <div className="stat">
            <div className="label">Paid / Owe / Overdue</div>
            <div className="value">
              {data.totals.paidCount} / {data.totals.oweCount} / {data.totals.overdueCount}
            </div>
          </div>
        </div>
      )}

      <table className="table" style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Tenant</th>
            <th>Due</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Paid</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.invoiceId}>
              <td>{x.unitCode || "-"}</td>
              <td>{x.tenantName || "-"}</td>
              <td>{new Date(x.dueDate).toLocaleDateString()}</td>
              <td>{x.status}</td>
              <td>{money(x.amount)}</td>
              <td>{x.paymentMethodText || "-"}</td>
              <td>{money(x.paid)}</td>
              <td>{money(x.balance)}</td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="7" className="muted">
                No data for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
