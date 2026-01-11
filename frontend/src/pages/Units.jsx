//src/pages/Units.jsx
import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Units() {
  const [units, setUnits] = useState([]);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const data = await api.get("/units");
      setUnits(data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/units", { code, notes });
      setCode("");
      setNotes("");
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const remove = async (id) => {
  if (!confirm("Delete this unit?")) return;
  setErr("");

  try {
    await api.del(`/units/${id}`);
    await load();
  } catch (e) {
    const msg =
      e?.response?.data?.message || "Failed to delete unit";
    setErr(msg);
  }
  };


  return (
    <div className="card">
      <h1>Units</h1>
      <p className="muted">Crea y administra tus miniapartamentos.</p>

      {err && <div className="error">{err}</div>}

      <form className="form" onSubmit={create}>
        <input placeholder="Code (A-01)" value={code} onChange={(e) => setCode(e.target.value)} required />
        <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="submit">Add Unit</button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Code</th>
            <th>Status</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.code}</td>
              <td>{u.status}</td>
              <td>{u.notes || "-"}</td>
              <td className="right">
                <button className="danger" onClick={() => remove(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {units.length === 0 && (
            <tr><td colSpan="5" className="muted">No units yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
