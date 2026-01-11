//src/pages/Tenants.jsx
import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      setTenants(await api.get("/tenants"));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/tenants", form);
      setForm({ name: "", phone: "" });
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this tenant?")) return;
    setErr("");
    try {
      await api.del(`/tenants/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  // ✅ Upload photo to backend -> backend uploads to Cloudinary -> saves photoUrl in DB
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const uploadPhoto = async (tenantId, file) => {
  if (!file) return;

  setErr("");
  try {
    const fd = new FormData();
    fd.append("photo", file); // MUST be "photo"

    await api.upload(`/tenants/${tenantId}/photo`, fd);
    await load();
  } catch (e) {
    const msg = e.message || "Failed to upload photo";
    setErr(msg);
  }
};



  return (
    <div className="card">
      <h1>Tenants</h1>
      <p className="muted">Register contact details for your tenants.</p>

      {err && <div className="error">{err}</div>}

      <form className="form" onSubmit={create}>
        <input
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <button type="submit">Add Tenant</button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Full Name</th>
            <th>Phone</th>
            <th>Photo</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {tenants.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.name}</td>
              <td>{t.phone || "-"}</td>

              <td>
                {t.photoUrl ? (
                  <img
                    src={t.photoUrl}
                    alt={t.name}
                    onClick={() => setPreviewPhoto(t.photoUrl)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid #ddd",
                      cursor: "pointer",
                    }}
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadPhoto(t.id, e.target.files?.[0])}
                  />
                )}
              </td>


              <td className="right">
                <button className="danger" onClick={() => remove(t.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {tenants.length === 0 && (
            <tr>
              <td colSpan="5" className="muted">
                No tenants yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
                width: 340,
                height: 340,
                objectFit: "cover",
                borderRadius: 18,
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
