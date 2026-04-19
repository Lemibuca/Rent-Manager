// src/pages/Units.jsx
import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Units() {
  const [units, setUnits] = useState([]);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const load = async () => {
    setErr("");
    try {
      const data = await api.get("/units");
      setUnits(data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      setErr(e.message || "Failed to delete unit");
    }
  };

  const uploadPhoto = async (unitId, file) => {
    if (!file) return;
    setErr("");

    try {
      const fd = new FormData();
      fd.append("photo", file);
      await api.upload(`/units/${unitId}/photo`, fd);
      await load();
    } catch (e) {
      setErr(e.message || "Failed to upload unit photo");
    }
  };

  return (
    <div className="card">
      <h1>Units</h1>
      <p className="muted">Create and manage your mini-apartments.</p>

      {err && <div className="error">{err}</div>}

      <form className="form" onSubmit={create}>
        <input
          placeholder="Code (A-01)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit">Add Unit</button>
      </form>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Photo</th>
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

                <td>
                  {u.coverPhotoUrl ? (
                    <img
                      src={u.coverPhotoUrl}
                      alt={u.code}
                      onClick={() => setPreviewPhoto(u.coverPhotoUrl)}
                      style={{
                        width: 74,
                        height: 54,
                        objectFit: "cover",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        cursor: "pointer",
                      }}
                    />
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadPhoto(u.id, e.target.files?.[0])}
                    />
                  )}
                </td>

                <td>{u.code}</td>
                <td>{u.status}</td>
                <td>{u.notes || "-"}</td>
                <td className="right">
                  <button className="danger" onClick={() => remove(u.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {units.length === 0 && (
              <tr>
                <td colSpan="6" className="muted">
                  No units yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: 10,
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <img
              src={previewPhoto}
              alt="Preview"
              style={{
                width: 420,
                maxWidth: "90vw",
                height: "auto",
                borderRadius: 18,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}