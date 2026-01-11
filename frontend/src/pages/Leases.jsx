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

  /* =========================
     Contract modal state
  ========================= */
  const [contractOpen, setContractOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);

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
    depositText: "depósito de garantía",

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
        end && start ? `desde ${start} hasta ${end}` : (c.contractDurationText || ""),
      // Small helper strings
      propertyDescription: c.propertyDescription || `Unidad: ${lease?.unit?.code ?? lease?.unitId ?? ""}`,
      usePurpose: c.usePurpose || "vivienda",
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
            <label className="muted">Rent (S/.)</label>
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
          <td>S/ {Number(l.rentAmount).toFixed(2)}</td>
          <td>{l.dueDay}</td>
          <td>{l.startDate ? String(l.startDate).slice(0, 10) : "-"}</td>
          <td>{l.endDate ? String(l.endDate).slice(0, 10) : "-"}</td>
          <td>{l.active ? "Yes" : "No"}</td>
          <td className="right" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => openContract(l)}>Contract</button>
            {l.active && <button type="button" onClick={() => closeLease(l.id)}>Close</button>}
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
              placeholder="e.g. 12 meses / desde 2026-01-01 hasta 2026-12-31"
            />
          </div>
        </div>

        {/* Printable Contract Body */}
        <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>CONTRATO DE ARRENDAMIENTO</h3>

          <p style={{ lineHeight: 1.45 }}>
            Consta por el presente documento el <b>CONTRATO DE ARRENDAMIENTO DE BIEN INMUEBLE</b> que celebran, de una parte,
            el señor <b>{contract.landlordName}</b>, identificado con DNI Nº <b>{contract.landlordDni}</b>, con domicilio en{" "}
            <b>{contract.landlordAddress}</b>, en adelante el <b>ARRENDADOR</b>, y de otra parte{" "}
            <b>{contract.tenantFullName || "_________________________"}</b>, identificado DNI Nº{" "}
            <b>{contract.tenantDni || "___________"}</b>, con domicilio{" "}
            <b>{contract.tenantAddress || "_________________________"}</b>, distrito de{" "}
            <b>{contract.tenantDistrict || "__________"}</b>, provincia{" "}
            <b>{contract.tenantProvince || "__________"}</b> y departamento de{" "}
            <b>{contract.tenantDepartment || "__________"}</b>, en adelante el <b>ARRENDATARIO</b>, de acuerdo con los siguientes términos y condiciones:
          </p>

          <p><b>PRIMERA: ANTECEDENTES</b><br />
            El ARRENDADOR es propietario del/ de los bien(es) inmueble(s) que se describe a continuación:{" "}
            <b>{contract.propertyDescription || "_________________________"}</b>.
          </p>

          <p><b>SEGUNDA: OBJETO DEL CONTRATO</b><br />
            2.1 Por el presente contrato, el ARRENDADOR otorga en arrendamiento el/los INMUEBLE(S) a favor del ARRENDATARIO, el cual declara conocerlo plenamente.<br />
            2.2 El ARRENDATARIO se obliga a pagar la renta en la forma y oportunidad pactada en la cláusula Tercera.<br />
            2.3 Las partes declaran que el/los INMUEBLE(S) serán destinados al uso:{" "}
            <b>{contract.usePurpose || "_________________________"}</b>.
          </p>

          <p><b>TERCERA: DE LA RENTA</b><br />
            3.1 La renta mensual pactada es de{" "}
            <b>S/ {selectedLease?.rentAmount ?? "_____"}</b>{" "}
            (__________), pagaderos en forma adelantada el día{" "}
            <b>{selectedLease?.dueDay ?? "___"}</b> de cada mes. De no cumplirse el pago en la fecha pactada se multará la cantidad de{" "}
            <b>{contract.penaltyPerDay || "_____"}</b> soles por cada día de retraso.<br />
            3.2 Con ocasión de la firma del presente documento, el ARRENDATARIO entrega al ARRENDADOR la suma de{" "}
            <b>{contract.depositAmount || "_________________________"}</b>{" "}
            en calidad de <b>{contract.depositText}</b>.
          </p>

          <p><b>CUARTA: DURACIÓN DEL ARRENDAMIENTO</b><br />
            El plazo de duración del presente contrato es de{" "}
            <b>{contract.contractDurationText || "_________________________"}</b>, contado a partir de la fecha de suscripción del presente documento. Podrá ser renovado por acuerdo entre las partes.
          </p>

          <p><b>QUINTA: SOBRE LA CONSERVACIÓN</b><br />
            El ARRENDATARIO está obligado a conservar y cuidar el/los INMUEBLE(S) arrendado(s), asumiendo gastos por descuido, negligencia, maltrato y/o uso diario, así como cualquier deterioro anormal.
          </p>

          <p><b>SEXTA: SOBRE LAS MEJORAS</b><br />
            Toda mejora efectuada por el ARRENDATARIO quedará en beneficio del ARRENDADOR, sin reembolso.
          </p>

          <p><b>SÉPTIMA: SOBRE EL ESTADO DEL INMUEBLE</b><br />
            El ARRENDADOR declara que el/los INMUEBLE(S) se entrega(n) en perfecto estado.
          </p>

          <p><b>OCTAVA: PAGO DE SERVICIOS</b><br />
            Serán de cuenta del ARRENDATARIO los pagos mensuales de servicios (electricidad, teléfono, internet, cable). El ARRENDADOR pagará el servicio de agua.
          </p>

          <p><b>NOVENA: SOBRE LA RESOLUCIÓN</b><br />
            El contrato podrá resolverse si el ARRENDATARIO incumple con el pago de un mes de renta.
          </p>

          <p><b>NOVENO PRIMERA: PROHIBICIÓN DE CEDER O SUBARRENDAR</b><br />
            El ARRENDATARIO se compromete a no traspasar o subarrendar sin autorización escrita del ARRENDADOR.
          </p>

          <p><b>NOVENO SEGUNDA: GARANTÍA</b><br />
            Depósito de garantía por la suma de <b>{contract.depositAmount || "_________________________"}</b>.
          </p>

          <p><b>NOVENO TERCERA: LEGISLACIÓN Y JURISDICCIÓN</b><br />
            Se aplica la legislación de la República del Perú. En caso de litigio, las partes se someten a la jurisdicción de los jueces y tribunales de la provincia y departamento de Arequipa.
          </p>

          <p style={{ marginTop: 18 }}>
            En señal de conformidad, las partes suscriben el presente documento.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
            <div>
              <b>EL ARRENDADOR</b><br />
              NAME: {contract.landlordName}<br />
              DNI: {contract.landlordDni}
            </div>
            <div>
              <b>EL ARRENDATARIO</b><br />
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
