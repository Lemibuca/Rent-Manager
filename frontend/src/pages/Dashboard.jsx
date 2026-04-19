// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const formatCurrencyPEN = (value) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(Number(value || 0));

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-PE");
  };

  useEffect(() => {
    api
      .get("/dashboard")
      .then(setDashboardData)
      .catch((err) => setErrorMessage(err.message));
  }, []);

  const pendingInvoices = useMemo(
    () => dashboardData?.pendingItems || [],
    [dashboardData]
  );
  const overdueInvoices = useMemo(
    () => dashboardData?.overdueItems || [],
    [dashboardData]
  );
  const occupiedRentals = useMemo(
    () => dashboardData?.occupiedLeases || [],
    [dashboardData]
  );

  return (
    <div className="card">
      <h1>Dashboard</h1>
      <p className="muted">Quick payment summary.</p>

      {errorMessage && <div className="error">{errorMessage}</div>}
      {!dashboardData && !errorMessage && (
        <div className="muted">Loading...</div>
      )}

      {dashboardData && (
        <>
          <div className="grid">
            <div
              className="stat stat-click"
              onClick={() => navigate(`/invoices?status=PENDING`)}
              title="View pending invoices"
              role="button"
              style={{ cursor: "pointer" }}
            >
              <div className="label">Pending</div>
              <div className="value">{dashboardData.pending}</div>

              <div style={{ marginTop: 10 }}>
                {pendingInvoices.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    No pending items
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {pendingInvoices.slice(0, 4).map((invoice, idx) => (
                      <div
                        key={invoice.invoiceId ?? idx}
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
                          {invoice.unitCode || "-"} • {invoice.tenantName || "-"}
                        </div>
                        <div style={{ fontWeight: 800 }}>
                          {formatCurrencyPEN(invoice.amount)}
                        </div>
                      </div>
                    ))}

                    {pendingInvoices.length > 4 && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        +{pendingInvoices.length - 4} more…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              className="stat stat-click"
              onClick={() => navigate(`/invoices?status=OVERDUE`)}
              title="View overdue invoices"
              role="button"
              style={{ cursor: "pointer" }}
            >
              <div className="label">Overdue</div>
              <div className="value">{dashboardData.overdue}</div>

              <div style={{ marginTop: 10 }}>
                {overdueInvoices.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    No overdue items
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {overdueInvoices.slice(0, 4).map((invoice, idx) => (
                      <div
                        key={invoice.invoiceId ?? idx}
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
                          {invoice.unitCode || "-"} • {invoice.tenantName || "-"}
                        </div>
                        <div style={{ fontWeight: 900, color: "red" }}>
                          {formatCurrencyPEN(invoice.amount)}
                        </div>
                      </div>
                    ))}

                    {overdueInvoices.length > 4 && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        +{overdueInvoices.length - 4} more…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <h2 style={{ margin: "6px 0 10px" }}>Occupied Leases</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Unit • Tenant • Rent/month • Next due date
            </p>

            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Tenant</th>
                  <th>Rent / month</th>
                  <th>Next payment</th>
                </tr>
              </thead>
              <tbody>
                {occupiedRentals.map((lease, idx) => (
                  <tr key={lease.leaseId ?? lease.id ?? idx}>
                    <td style={{ fontWeight: 700 }}>{lease.unitCode || "-"}</td>
                    <td>{lease.tenantName || "-"}</td>
                    <td style={{ fontWeight: 800 }}>
                      {formatCurrencyPEN(lease.rentAmount)}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatDate(lease.nextDueDate)}
                    </td>
                  </tr>
                ))}

                {occupiedRentals.length === 0 && (
                  <tr>
                    <td colSpan="4" className="muted">
                      No occupied leases (occupiedLeases empty).
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