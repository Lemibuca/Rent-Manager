// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  // ✅ Moneda soles
  const pen = (n) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(n || 0));

  const formatDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("es-PE");
  };

  useEffect(() => {
    api
      .get("/dashboard")
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  // ✅ Esperados del backend
  const pendingItems = useMemo(() => data?.pendingItems || [], [data]);
  const overdueItems = useMemo(() => data?.overdueItems || [], [data]);
  const occupiedLeases = useMemo(() => data?.occupiedLeases || [], [data]);

  return (
    <div className="card">
      <h1>Dashboard</h1>
      <p className="muted">Resumen rápido de cobros.</p>

      {err && <div className="error">{err}</div>}
      {!data && !err && <div className="muted">Cargando...</div>}

      {data && (
        <>
          <div className="grid">
            {/* PENDIENTES */}
            <div
              className="stat stat-click"
              onClick={() => navigate(`/invoices?status=PENDING`)}
              title="Ver pendientes"
              role="button"
              style={{ cursor: "pointer" }}
            >
              <div className="label">Pendientes</div>
              <div className="value">{data.pending}</div>

              {/* ✅ mini lista dentro */}
              <div style={{ marginTop: 10 }}>
                {pendingItems.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    Sin pendientes
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {pendingItems.slice(0, 4).map((x, idx) => (
                      <div
                        key={x.invoiceId ?? idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: 13,
                          paddingTop: 4,
                          borderTop: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {x.unitCode || "-"} • {x.tenantName || "-"}
                        </div>
                        <div style={{ fontWeight: 800 }}>{pen(x.amount)}</div>
                      </div>
                    ))}

                    {pendingItems.length > 4 && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        +{pendingItems.length - 4} más…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* VENCIDOS */}
            <div
              className="stat stat-click"
              onClick={() => navigate(`/invoices?status=OVERDUE`)}
              title="Ver vencidos"
              role="button"
              style={{ cursor: "pointer" }}
            >
              <div className="label">Vencidos</div>
              <div className="value">{data.overdue}</div>

              {/* ✅ mini lista dentro (rojo) */}
              <div style={{ marginTop: 10 }}>
                {overdueItems.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    Sin vencidos
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {overdueItems.slice(0, 4).map((x, idx) => (
                      <div
                        key={x.invoiceId ?? idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: 13,
                          paddingTop: 4,
                          borderTop: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "red" }}>
                          {x.unitCode || "-"} • {x.tenantName || "-"}
                        </div>
                        <div style={{ fontWeight: 900, color: "red" }}>{pen(x.amount)}</div>
                      </div>
                    ))}

                    {overdueItems.length > 4 && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        +{overdueItems.length - 4} más…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ ABAJO: lista de rentas ocupadas */}
          <div style={{ marginTop: 18 }}>
            <h2 style={{ margin: "6px 0 10px" }}>Rentas ocupadas</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Unit • Tenant • Renta/mes • Próxima fecha de pago
            </p>

            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Tenant</th>
                  <th>Rent / mes</th>
                  <th>Próximo pago</th>
                </tr>
              </thead>
              <tbody>
                {occupiedLeases.map((l, idx) => (
                  <tr key={l.leaseId ?? l.id ?? idx}>
                    <td style={{ fontWeight: 700 }}>{l.unitCode || "-"}</td>
                    <td>{l.tenantName || "-"}</td>
                    <td style={{ fontWeight: 800 }}>{pen(l.rentAmount)}</td>
                    <td style={{ fontWeight: 700 }}>{formatDate(l.nextDueDate)}</td>
                  </tr>
                ))}

                {occupiedLeases.length === 0 && (
                  <tr>
                    <td colSpan="4" className="muted">
                      No hay leases ocupados (occupiedLeases vacío).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
