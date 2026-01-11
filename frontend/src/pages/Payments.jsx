// src/pages/Payments.jsx
import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});
const money = (n) => PEN.format(Number(n || 0));

export default function Payments() {
  const [invoices, setInvoices] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    method: "cash",
  });

  const load = async () => {
    setErr("");
    try {
      // trae pendientes para pagar rápido
      const data = await api.get("/invoices?status=PENDING");
      setInvoices(data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/payments", {
        invoiceId: Number(form.invoiceId),
        amount: Number(form.amount),
        method: form.method,
      });
      setMsg("Payment recorded ✅");
      setForm({ invoiceId: "", amount: "", method: "cash" });
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <div className="card">
      <h1>Payments</h1>
      <p className="muted">Registra pagos (manual) y actualiza balances.</p>

      {err && <div className="error">{err}</div>}
      {msg && <div className="ok">{msg}</div>}

      <form className="form" onSubmit={submit}>
        <select
          value={form.invoiceId}
          onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
          required
        >
          <option value="">Select invoice</option>

          {invoices.map((i) => {
            const tenantName = i?.lease?.tenant?.name || "Sin tenant";
            const unitCode = i?.lease?.unit?.code || "Sin unit";

            return (
              <option key={i.id} value={i.id}>
                {tenantName} • {unitCode} • {i.period} • balance {money(i.balance)}
              </option>
            );
          })}
        </select>

        <input
          type="number"
          min="1"
          placeholder="Amount (S/)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />

        <select
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
        >
          <option value="cash">cash</option>
          <option value="yape">yape</option>     {/* ✅ add */}
          <option value="plin">plin</option>     {/* ✅ add */}
          <option value="zelle">zelle</option>
          <option value="transfer">transfer</option>
          <option value="check">check</option>
        </select>

        <button type="submit">Record Payment</button>
      </form>
    </div>
  );
}
