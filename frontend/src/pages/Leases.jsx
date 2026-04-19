// frontend/src/pages/Leases.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client.js";

/* ---------------------------
   Signature Pad (no libraries)
---------------------------- */
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    setDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange?.("");
  };

  // If you want to render a previously saved signature, you can extend this later.

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={520}
        height={160}
        style={{ border: "1px solid #d0d0d0", borderRadius: 10, width: "100%" }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={clear}>Clear</button>
      </div>
      {!!value && (
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          Signature captured ✅
        </div>
      )}
    </div>
  );
}

/* ---------------------------
   Simple Modal (no libraries)
---------------------------- */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 18px 50px rgba(0,0,0,.2)",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function Leases() {
  const [leases, setLeases] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [err, setErr] = useState("");

  // ✅ Added endDate
  const [form, setForm] = useState({
    unitId: "",
    tenantId: "",
    rentAmount: 1200,
    dueDay: 5,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "", // YYYY-MM-DD or empty
  });

  const load = async () => {
    setErr("");
    try {
      const [l, u, t] = await Promise.all([
        api.get("/leases"),
        api.get("/units"),
        api.get("/tenants"),
      ]);
      setLeases(l);
      setUnits(u);
      setTenants(t);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr("");

    // Optional basic validation (client-side)
    if (form.endDate && form.endDate < form.startDate) {
      setErr("End Date must be after Start Date.");
      return;
    }

    try {
      await api.post("/leases", {
        ...form,
        unitId: Number(form.unitId),
        tenantId: Number(form.tenantId),
        rentAmount: Number(form.rentAmount),
        dueDay: Number(form.dueDay),
        startDate: form.startDate,
        endDate: form.endDate || null,
      });
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message);
    }
  };
  const concludeLease = async (lease) => {
  const reason =
    prompt(
      "Why is this lease being concluded?",
      "Contract ended or tenant moved out early"
    ) || "";

  try {
    await api.post(`/leases/${lease.id}/close`, {
      conclusionReason: reason,
    });

    await load();
  } catch (e) {
    setErr(e.message || "Failed to conclude lease");
  }
  };
  const closeLease = async (id) => {
    if (!confirm("Close this lease?")) return;
    setErr("");
    try {
      await api.post(`/leases/${id}/close`, {});
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  const deleteLease = async (lease) => {
  const ok = confirm(
    "Are you sure you want to delete this concluded lease? This should only be done if you no longer need the record."
  );

  if (!ok) return;

  try {
    await api.del(`/leases/${lease.id}`);
    await load();
  } catch (e) {
    setErr(e.message || "Failed to delete lease");
  }
  };

  /* =========================
     Contract modal state
  ========================= */
  const [contractOpen, setContractOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photoLease, setPhotoLease] = useState(null);
  const [photoItems, setPhotoItems] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoNote, setPhotoNote] = useState("");
  const [photoType, setPhotoType] = useState("PRE_RENTAL");
  const [photoPreview, setPhotoPreview] = useState(null);

  // Editable contract fields
  const [contract, setContract] = useState({
    landlordName: "Jules David Rodriguez Taboada",
    landlordDni: "45016076",
    landlordAddress: "jirón Ayacucho N.º 304, distrito de Caraveli, provincia de Caraveli y departamento de Arequipa",

    tenantFullName: "",
    tenantDni: "",
    tenantAddress: "",
    tenantDistrict: "",
    tenantProvince: "",
    tenantDepartment: "",

    propertyDescription: "",
    usePurpose: "",
    penaltyPerDay: "",
    depositAmount: "",
    depositText: "security deposit",

    contractDurationText: "",
    city: "Arequipa",
    province: "Caraveli",
    day: "",
    monthText: "",
    year: new Date().getFullYear(),

    // signatures as data URLs
    landlordSig: "",
    tenantSig: "",
  });

  const openContract = (lease) => {
    setSelectedLease(lease);

    // Pre-fill tenant name + rent/due day + dates into fields
    const tenantName = lease?.tenant?.name ?? "";
    const rent = lease?.rentAmount ?? "";
    const dueDay = lease?.dueDay ?? "";
    const start = lease?.startDate ? String(lease.startDate).slice(0, 10) : "";
    const end = lease?.endDate ? String(lease.endDate).slice(0, 10) : "";

    setContract((c) => ({
      ...c,
      tenantFullName: tenantName || c.tenantFullName,
      contractDurationText:
        end && start ? `from ${start} to ${end}` : (c.contractDurationText || ""),
      // Small helper strings
      propertyDescription: c.propertyDescription || `Unit: ${lease?.unit?.code ?? lease?.unitId ?? ""}`,
      usePurpose: c.usePurpose || "residential",
      penaltyPerDay: c.penaltyPerDay || "",
      depositAmount: c.depositAmount || "",
      // reset signatures for each open (optional)
      landlordSig: "",
      tenantSig: "",
    }));

    setContractOpen(true);
  };

  const closeContract = () => {
    setContractOpen(false);
    setSelectedLease(null);
  };

    const openPhotos = async (lease) => {
    setErr("");
    setPhotoLease(lease);
    setPhotoFile(null);
    setPhotoNote("");
    setPhotoType("PRE_RENTAL");

    try {
      const items = await api.get(`/leases/${lease.id}/inspection-photos`);
      setPhotoItems(items);
      setPhotosOpen(true);
    } catch (e) {
      setErr(e.message || "Failed to load inspection photos");
    }
  };

  const uploadInspectionPhoto = async () => {
    if (!photoLease || !photoFile) return;

    setErr("");
    try {
      const fd = new FormData();
      fd.append("photo", photoFile);
      fd.append("note", photoNote);
      fd.append("type", photoType);

      await api.upload(`/leases/${photoLease.id}/inspection-photos`, fd);

      const items = await api.get(`/leases/${photoLease.id}/inspection-photos`);
      setPhotoItems(items);
      setPhotoFile(null);
      setPhotoNote("");
      setPhotoType("PRE_RENTAL");
      await load();
    } catch (e) {
      setErr(e.message || "Failed to upload inspection photo");
    }
  };

  const printContract = () => {
    // Best free option: browser print -> Save as PDF
    window.print();
  };

  const selectedTenant = useMemo(() => {
    const id = Number(form.tenantId);
    return tenants.find((t) => t.id === id) || null;
  }, [form.tenantId, tenants]);

  return (
    <div className="card">
      <h1>Leases</h1>
      <p className="muted">Assign a tenant to a unit and define the rent amount and due day.</p>

      {err && <div className="error">{err}</div>}

      {/* ✅ Labels + End Date */}
      <form className="form" onSubmit={create}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12, width: "100%" }}>
          <div style={{ gridColumn: "span 2" }}>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Unit</label>
            <select
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              required
              style={{ width: "100%" }}
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Tenant</label>
            <select
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              required
              style={{ width: "100%" }}
            >
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rent */}
          <div style={{ gridColumn: "span 2" }} className="field">
            <label className="muted">Rent ($)</label>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.rentAmount}
              onChange={(e) => setForm({ ...form, rentAmount: e.target.value })}
            />
          </div>

          {/* Due Day */}
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label className="muted">Due Day</label>
            <input
              type="number"
              min="1"
              max="28"
              className="dueDay"
              value={form.dueDay}
              onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
            />
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label className="muted">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label className="muted">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: "span 2", display: "flex", alignItems: "end" }}>
            <button type="submit" style={{ width: "100%" }}>Create Lease</button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Unit</th>
              <th>Tenant</th>
              <th>Rent</th>
              <th>Due Day</th>
              <th>Start</th>
              <th>End</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {leases.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.unit?.code ?? l.unitId}</td>
                <td>{l.tenant?.name ?? l.tenantId}</td>
                <td>$ {Number(l.rentAmount).toFixed(2)}</td>
                <td>{l.dueDay}</td>
                <td>{l.startDate ? String(l.startDate).slice(0, 10) : "-"}</td>
                <td>{l.endDate ? String(l.endDate).slice(0, 10) : "-"}</td>
                <td>
                  {l.active ? "Active" : `Concluded - ${l.conclusionReason || "No reason provided"}`}
                </td>
                <td
                  className="right"
                  style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}
                >
                  <button type="button" onClick={() => openContract(l)}>
                    Contract
                  </button>

                  <button type="button" className="ghost" onClick={() => openPhotos(l)}>
                    Photos ({l.inspectionPhotos?.length || 0})
                  </button>

                  {l.active ? (
                    <button type="button" onClick={() => concludeLease(l)}>
                      Conclude
                    </button>
                  ) : (
                    <button type="button" className="danger" onClick={() => deleteLease(l)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {leases.length === 0 && (
              <tr><td colSpan="9" className="muted">No leases yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Contract Modal */}
            <Modal
        open={photosOpen}
        title={`Inspection Photos${photoLease ? ` - Unit ${photoLease.unit?.code ?? photoLease.unitId}` : ""}`}
        onClose={() => setPhotosOpen(false)}
      >
        <div style={{ display: "grid", gap: 14 }}>
          {photoLease?.unit?.coverPhotoUrl && (
            <div>
              <div className="muted" style={{ marginBottom: 8 }}>Unit cover photo</div>
              <img
                src={photoLease.unit.coverPhotoUrl}
                alt={photoLease.unit?.code || "Unit"}
                style={{
                  width: 220,
                  maxWidth: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />
            </div>
          )}

          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Add Property Photos</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              Upload move-in or move-out condition photos for walls, doors, kitchen, bathroom, floor, and windows.
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />

              <select value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
                <option value="PRE_RENTAL">Pre-rental / Move-in</option>
                <option value="POST_RENTAL">Post-rental / Move-out</option>
              </select>

              <input
                placeholder="Optional note (example: living room wall condition)"
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
              />

              <button type="button" onClick={uploadInspectionPhoto}>
                Upload Photo
              </button>
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: 10 }}>Gallery</h3>

            {photoItems.length === 0 ? (
              <div className="muted">No inspection photos yet.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                {photoItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 10,
                      background: "#fafafa",
                    }}
                  >
                    <img
                      src={item.photoUrl}
                      alt={item.note || item.type}
                      onClick={() => setPhotoPreview(item.photoUrl)}
                      style={{
                        width: "100%",
                        height: 130,
                        objectFit: "cover",
                        borderRadius: 10,
                        cursor: "pointer",
                        border: "1px solid #ddd",
                      }}
                    />
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>
                      {item.type === "PRE_RENTAL" ? "Pre-rental" : "Post-rental"}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {item.note || "No note"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {photoPreview && (
        <div
          onClick={() => setPhotoPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 12000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 10,
              borderRadius: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <img
              src={photoPreview}
              alt="Inspection preview"
              style={{
                width: "min(90vw, 700px)",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      )}
      <Modal open={contractOpen} title="Lease Contract (Peru Format)" onClose={closeContract}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Tenant Full Name</label>
            <input
              value={contract.tenantFullName}
              onChange={(e) => setContract({ ...contract, tenantFullName: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Tenant DNI</label>
            <input
              value={contract.tenantDni}
              onChange={(e) => setContract({ ...contract, tenantDni: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Tenant Address</label>
            <input
              value={contract.tenantAddress}
              onChange={(e) => setContract({ ...contract, tenantAddress: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>District</label>
            <input
              value={contract.tenantDistrict}
              onChange={(e) => setContract({ ...contract, tenantDistrict: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Province</label>
            <input
              value={contract.tenantProvince}
              onChange={(e) => setContract({ ...contract, tenantProvince: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Department</label>
            <input
              value={contract.tenantDepartment}
              onChange={(e) => setContract({ ...contract, tenantDepartment: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Property Description</label>
            <input
              value={contract.propertyDescription}
              onChange={(e) => setContract({ ...contract, propertyDescription: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Use Purpose</label>
            <input
              value={contract.usePurpose}
              onChange={(e) => setContract({ ...contract, usePurpose: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Penalty (S/ per day)</label>
            <input
              value={contract.penaltyPerDay}
              onChange={(e) => setContract({ ...contract, penaltyPerDay: e.target.value })}
              style={{ width: "100%" }}
              placeholder="e.g. 10"
            />
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Deposit Amount (S/)</label>
            <input
              value={contract.depositAmount}
              onChange={(e) => setContract({ ...contract, depositAmount: e.target.value })}
              style={{ width: "100%" }}
              placeholder="e.g. 1200"
            />
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>Contract Duration Text</label>
            <input
              value={contract.contractDurationText}
              onChange={(e) => setContract({ ...contract, contractDurationText: e.target.value })}
              style={{ width: "100%" }}
              placeholder="e.g. 12 months / from 2026-01-01 to 2026-12-31"
            />
          </div>
        </div>

        {/* Printable Contract Body */}
        <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>RENTAL AGREEMENT</h3>

          <p style={{ lineHeight: 1.45 }}>
            This document is the <b>RENTAL AGREEMENT FOR REAL ESTATE</b> entered into by, on the one hand,
            Mr. <b>{contract.landlordName}</b>, identified with DNI No. <b>{contract.landlordDni}</b>, domiciled at{" "}
            <b>{contract.landlordAddress}</b>, hereinafter the <b>LANDLORD</b>, and on the other hand{" "}
            <b>{contract.tenantFullName || "_________________________"}</b>, identified with DNI No.{" "}
            <b>{contract.tenantDni || "___________"}</b>, domiciled at{" "}
            <b>{contract.tenantAddress || "_________________________"}</b>, district of{" "}
            <b>{contract.tenantDistrict || "__________"}</b>, province of{" "}
            <b>{contract.tenantProvince || "__________"}</b>, department of{" "}
            <b>{contract.tenantDepartment || "__________"}</b>, hereinafter the <b>TENANT</b>, under the following terms and conditions:
          </p>

          <p><b>FIRST: BACKGROUND</b><br />
            The LANDLORD is the owner of the property(ies) described as:{" "}
            <b>{contract.propertyDescription || "_________________________"}</b>.
          </p>

          <p><b>SECOND: OBJECT OF THE CONTRACT</b><br />
            2.1 By this contract, the LANDLORD leases the property(ies) to the TENANT, who declares to know it fully.<br />
            2.2 The TENANT commits to pay the rent as agreed in Clause Three.<br />
            2.3 The parties declare that the property(ies) will be used for:{" "}
            <b>{contract.usePurpose || "_________________________"}</b>.
          </p>

          <p><b>THIRD: RENT</b><br />
            3.1 The agreed monthly rent is{" "}
            <b>$ {selectedLease?.rentAmount ?? "_____"}</b>{" "}
            (__________), payable in advance on day{" "}
            <b>{selectedLease?.dueDay ?? "___"}</b> of each month. Late payments will incur a penalty of{" "}
            <b>{contract.penaltyPerDay || "_____"}</b> soles per day.<br />
            3.2 Upon signing this document, the TENANT gives the LANDLORD the amount of{" "}
            <b>{contract.depositAmount || "_________________________"}</b>{" "}
            as <b>{contract.depositText}</b>.
          </p>

          <p><b>FOURTH: DURATION OF THE LEASE</b><br />
            The lease term is{" "}
            <b>{contract.contractDurationText || "_________________________"}</b>, commencing from the signing date. It may be renewed by agreement of the parties.
          </p>

          <p><b>FIFTH: MAINTENANCE</b><br />
            The TENANT must maintain and care for the leased property, and is responsible for costs due to negligence, misuse, or abnormal wear.
          </p>

          <p><b>SIXTH: IMPROVEMENTS</b><br />
            Any improvements made by the TENANT benefit the LANDLORD without reimbursement.
          </p>

          <p><b>SEVENTH: CONDITION OF THE PROPERTY</b><br />
            The LANDLORD declares that the property is delivered in perfect condition.
          </p>

          <p><b>EIGHTH: UTILITY PAYMENTS</b><br />
            Monthly service payments (electricity, telephone, internet, cable) are the TENANT’s responsibility. The LANDLORD pays water.
          </p>

          <p><b>NINTH: TERMINATION</b><br />
            The contract can be terminated if the TENANT fails to pay one month’s rent.
          </p>

          <p><b>NINTH FIRST: NO ASSIGNMENT OR SUBLEASE</b><br />
            The TENANT agrees not to transfer or sublease without written consent from the LANDLORD.
          </p>

          <p><b>NINTH SECOND: SECURITY DEPOSIT</b><br />
            Security deposit amount: <b>{contract.depositAmount || "_________________________"}</b>.
          </p>

          <p><b>NINTH THIRD: LAW AND JURISDICTION</b><br />
            Peruvian law applies. For disputes, parties submit to courts in the province and department of Arequipa.
          </p>

          <p style={{ marginTop: 18 }}>
            In agreement, the parties sign this document.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
            <div>
              <b>LANDLORD</b><br />
              NAME: {contract.landlordName}<br />
              DNI: {contract.landlordDni}
            </div>
            <div>
              <b>TENANT</b><br />
              NAME: {contract.tenantFullName || "________________"}<br />
              DNI: {contract.tenantDni || "________________"}
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Landlord Signature</h4>
            <SignaturePad value={contract.landlordSig} onChange={(v) => setContract({ ...contract, landlordSig: v })} />
          </div>
          <div>
            <h4 style={{ marginTop: 0 }}>Tenant Signature</h4>
            <SignaturePad value={contract.tenantSig} onChange={(v) => setContract({ ...contract, tenantSig: v })} />
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={printContract}>Print / Save PDF</button>
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Tip: Click “Print / Save PDF” → choose “Save as PDF”. This is free and doesn’t store the contract yet.
        </div>
      </Modal>
    </div>
  );
}
