//src/components/Nav.jsx
import { NavLink } from "react-router-dom";

export default function Nav() {
  const linkStyle = ({ isActive }) => ({
    padding: "10px 12px",
    borderRadius: 10,
    textDecoration: "none",
    color: isActive ? "white" : "#111",
    background: isActive ? "#111" : "transparent",
  });

  return (
    <nav className="nav">
      <div className="brand" style={{ fontSize: "30px" }}>
        🏠 Rent Manager
      </div>
      <div className="links">
        <NavLink to="/" style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/units" style={linkStyle}>Units</NavLink>
        <NavLink to="/tenants" style={linkStyle}>Tenants</NavLink>
        <NavLink to="/leases" style={linkStyle}>Leases</NavLink>
        <NavLink to="/invoices" style={linkStyle}>Invoices</NavLink>
        <NavLink to="/payments" style={linkStyle}>Payments</NavLink>
        <NavLink to="/summary" style={linkStyle}>Summary</NavLink>

      </div>
    </nav>
  );
}
