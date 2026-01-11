// backend/src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   Cloudinary (Tenant Photos)
========================= */

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* =========================
   Helpers
========================= */

function parseIntStrict(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${name} must be an integer`);
  return n;
}

function toISODateOnly(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeDueDate(period, dueDay) {
  // period: "YYYY-MM", dueDay: 1..28
  const [yStr, mStr] = period.split("-");
  const y = parseIntStrict(yStr, "period year");
  const m = parseIntStrict(mStr, "period month");
  const day = parseIntStrict(dueDay, "dueDay");
  return new Date(y, m - 1, day, 12, 0, 0); // noon avoids DST edge cases
}

function currentPeriod() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* =========================
   Root
========================= */
app.get("/", (_, res) => {
  res.send("✅ Rent Manager API running");
});

/* =========================
   Dashboard
========================= */
app.get("/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // counts
    const overdue = await prisma.invoice.count({
      where: { status: "OVERDUE", balance: { gt: 0 } },
    });
    const pending = await prisma.invoice.count({
      where: { status: "PENDING", balance: { gt: 0 } },
    });
    const partial = await prisma.invoice.count({
      where: { status: "PARTIAL", balance: { gt: 0 } },
    });

    // helper: próxima fecha de pago según dueDay
    const calcNextDueDate = (dueDay) => {
      const y = today.getFullYear();
      const m = today.getMonth();

      const dueThisMonth = new Date(y, m, dueDay, 12, 0, 0);
      if (today <= dueThisMonth) return dueThisMonth;

      return new Date(y, m + 1, dueDay, 12, 0, 0);
    };

    // pendientes lista
    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: "PENDING", balance: { gt: 0 } },
      include: {
        lease: { include: { unit: true, tenant: true } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 20,
    });

    const pendingItems = pendingInvoices.map((inv) => ({
      invoiceId: inv.id,
      unitCode: inv.lease?.unit?.code || null,
      tenantName: inv.lease?.tenant?.name || null,
      amount: inv.amount,
      dueDate: inv.dueDate,
      balance: inv.balance,
      status: inv.status,
    }));

    // vencidos lista
    const overdueInvoices = await prisma.invoice.findMany({
      where: { status: "OVERDUE", balance: { gt: 0 } },
      include: {
        lease: { include: { unit: true, tenant: true } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 20,
    });

    const overdueItems = overdueInvoices.map((inv) => ({
      invoiceId: inv.id,
      unitCode: inv.lease?.unit?.code || null,
      tenantName: inv.lease?.tenant?.name || null,
      amount: inv.amount,
      dueDate: inv.dueDate,
      balance: inv.balance,
      status: inv.status,
    }));

    // leases activos (ocupados) + nextDueDate
    const leases = await prisma.lease.findMany({
      where: { active: true },
      include: { unit: true, tenant: true },
      orderBy: [{ id: "asc" }],
    });

    const occupiedLeases = leases.map((l) => ({
      leaseId: l.id,
      unitCode: l.unit?.code || null,
      tenantName: l.tenant?.name || null,
      rentAmount: l.rentAmount,
      dueDay: l.dueDay,
      nextDueDate: calcNextDueDate(l.dueDay),
    }));

    res.json({
      overdue,
      pending,
      partial,
      pendingItems,
      overdueItems,
      occupiedLeases,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Dashboard error" });
  }
});

/* =========================
   Units
========================= */

// List units
app.get("/units", async (req, res) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { id: "asc" },
    });
    res.json(units);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list units" });
  }
});

// Create unit
app.post("/units", async (req, res) => {
  try {
    const { code, notes } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: "code required" });

    const unit = await prisma.unit.create({
      data: { code: code.trim(), notes: notes?.trim() || null },
    });

    res.json(unit);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create unit" });
  }
});

// Delete unit (block if FK)
app.delete("/units/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.unit.delete({ where: { id } });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /units/:id", err);

    if (err?.code === "P2003") {
      return res.status(409).json({
        ok: false,
        message:
          "No se puede borrar esta unidad porque tiene datos asociados (tenants/leases/invoices/payments). Primero elimina o finaliza esos registros.",
      });
    }

    if (err?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "Unidad no encontrada." });
    }

    return res.status(500).json({ ok: false, message: "Error interno al borrar la unidad." });
  }
});

/* =========================
   Tenants
========================= */

// List tenants (NO email)
app.get("/tenants", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, phone: true, photoUrl: true },
    });
    res.json(tenants);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

// Create tenant (NO email)
app.post("/tenants", async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name required" });

    const tenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
      },
      select: { id: true, name: true, phone: true, photoUrl: true },
    });

    res.json(tenant);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create tenant" });
  }
});

// Upload tenant photo
app.post("/tenants/:id/photo", upload.single("photo"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, message: "Invalid tenant id." });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message:
          "No file uploaded. Make sure you're sending multipart/form-data and the field name is 'photo'.",
      });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({
        ok: false,
        message: "Only JPG, PNG, or WEBP images are allowed.",
      });
    }

    const b64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "rent-manager/tenants",
    });

    const updated = await prisma.tenant.update({
      where: { id },
      data: { photoUrl: result.secure_url },
      select: { id: true, name: true, phone: true, photoUrl: true },
    });

    return res.json({ ok: true, tenant: updated });
  } catch (err) {
    console.error("Upload tenant photo error:", err);

    if (err?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "Tenant not found." });
    }

    return res.status(500).json({
      ok: false,
      message: err?.message || "Failed to upload photo.",
    });
  }
});

// Delete tenant (block if FK)
app.delete("/tenants/:id", async (req, res) => {
  try {
    const id = parseIntStrict(req.params.id, "id");
    await prisma.tenant.delete({ where: { id } });
    res.json({ ok: true, message: "Tenant deleted" });
  } catch (err) {
    console.error("DELETE /tenants/:id", err);

    if (err?.code === "P2003") {
      return res.status(409).json({
        ok: false,
        message:
          "Cannot delete this tenant because there are records linked to them (leases/invoices/payments). Close/delete those first.",
      });
    }

    if (err?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "Tenant not found." });
    }

    res.status(500).json({ ok: false, message: "Failed to delete tenant" });
  }
});

/* =========================
   Leases
========================= */

// List leases
app.get("/leases", async (req, res) => {
  try {
    const leases = await prisma.lease.findMany({
      include: { unit: true, tenant: true },
      orderBy: { id: "asc" },
    });
    res.json(leases);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list leases" });
  }
});

// Create lease
app.post("/leases", async (req, res) => {
  try {
    const { unitId, tenantId, rentAmount, dueDay, startDate, endDate } = req.body;

    const uId = parseIntStrict(unitId, "unitId");
    const tId = parseIntStrict(tenantId, "tenantId");
    const rent = parseIntStrict(rentAmount, "rentAmount");
    const dd = dueDay == null ? 5 : parseIntStrict(dueDay, "dueDay");

    if (dd < 1 || dd > 28) {
      return res.status(400).json({ error: "dueDay must be 1..28" });
    }
    if (rent < 0) {
      return res.status(400).json({ error: "rentAmount must be >= 0" });
    }

    const sd = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(sd.getTime())) {
      return res.status(400).json({ error: "startDate invalid (use YYYY-MM-DD)" });
    }

    const ed = endDate ? new Date(endDate) : null;
    if (ed && Number.isNaN(ed.getTime())) {
      return res.status(400).json({ error: "endDate invalid (use YYYY-MM-DD)" });
    }
    if (ed && ed < sd) {
      return res.status(400).json({ error: "endDate must be after startDate" });
    }

    const unit = await prisma.unit.findUnique({ where: { id: uId } });
    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    const existingActive = await prisma.lease.findFirst({
      where: { unitId: uId, active: true },
    });
    if (existingActive) {
      return res.status(400).json({ error: "Unit already has an active lease" });
    }

    const lease = await prisma.lease.create({
      data: {
        unitId: uId,
        tenantId: tId,
        rentAmount: rent,
        dueDay: dd,
        startDate: sd,
        endDate: ed,
        active: true,
      },
      include: { unit: true, tenant: true },
    });

    await prisma.unit.update({
      where: { id: uId },
      data: { status: "OCCUPIED" },
    });

    res.json(lease);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create lease" });
  }
});

// Close lease
app.post("/leases/:id/close", async (req, res) => {
  try {
    const id = parseIntStrict(req.params.id, "id");

    const lease = await prisma.lease.findUnique({ where: { id } });
    if (!lease) return res.status(404).json({ error: "Lease not found" });

    if (!lease.active) return res.json({ message: "Lease already closed" });

    await prisma.lease.update({
      where: { id },
      data: { active: false },
    });

    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "AVAILABLE" },
    });

    res.json({ message: "Lease closed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to close lease" });
  }
});

/* =========================
   Invoices
========================= */

// List invoices with optional filters
app.get("/invoices", async (req, res) => {
  try {
    const { period, status } = req.query;

    const where = {};
    if (period) where.period = String(period);
    if (status) where.status = String(status);

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true, // ✅ útil si quieres mostrar unit code en lista invoices
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    });

    res.json(invoices);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list invoices" });
  }
});

// Generate invoices for a period for all active leases
// POST /invoices/generate?period=YYYY-MM
app.post("/invoices/generate", async (req, res) => {
  try {
    const period = String(req.query.period || "");
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: "Period required (YYYY-MM)" });
    }

    const leases = await prisma.lease.findMany({ where: { active: true } });

    for (const lease of leases) {
      const dueDate = makeDueDate(period, lease.dueDay);

      await prisma.invoice.upsert({
        where: {
          leaseId_period: { leaseId: lease.id, period },
        },
        update: {},
        create: {
          leaseId: lease.id,
          period,
          dueDate,
          amount: lease.rentAmount,
          balance: lease.rentAmount,
          status: "PENDING",
        },
      });
    }

    res.json({ message: "Invoices generated (upsert)" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Invoice generation failed" });
  }
});

/* =========================
   Payments
========================= */

// Record payment and update invoice balance/status
app.post("/payments", async (req, res) => {
  try {
    const { invoiceId, amount, method } = req.body;

    const invId = parseIntStrict(invoiceId, "invoiceId");
    const payAmount = parseIntStrict(amount, "amount");
    const payMethod = String(method || "cash");

    if (payAmount <= 0) return res.status(400).json({ error: "amount must be > 0" });

    const invoice = await prisma.invoice.findUnique({ where: { id: invId } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    if (invoice.status === "PAID" && invoice.balance === 0) {
      return res.status(400).json({ error: "Invoice already paid" });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: invId,
        amount: payAmount,
        method: payMethod,
      },
    });

    const newBalance = Math.max(0, invoice.balance - payAmount);

    let newStatus = invoice.status;
    if (newBalance === 0) newStatus = "PAID";
    else newStatus = "PARTIAL";

    if (invoice.status === "OVERDUE" && newBalance > 0) {
      newStatus = "OVERDUE";
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invId },
      data: {
        balance: newBalance,
        status: newStatus,
      },
    });

    res.json({ payment, invoice: updatedInvoice });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to record payment" });
  }
});

/* =========================
   Daily job
========================= */

app.post("/jobs/daily", async (_, res) => {
  try {
    const today = new Date();

    await prisma.invoice.updateMany({
      where: {
        dueDate: { lt: today },
        status: { in: ["PENDING", "PARTIAL"] },
        balance: { gt: 0 },
      },
      data: { status: "OVERDUE" },
    });

    res.json({ message: "Daily job executed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Daily job failed" });
  }
});

app.post("/jobs/generate-upcoming", async (req, res) => {
  try {
    const daysBefore = Number(req.query.daysBefore ?? 5);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const leases = await prisma.lease.findMany({
      where: { active: true },
    });

    let createdOrEnsured = 0;

    for (const lease of leases) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();

      const dueThisMonth = new Date(y, m, lease.dueDay, 12, 0, 0);
      const target = today <= dueThisMonth ? { year: y, month: m } : { year: y, month: m + 1 };

      const period = `${target.year}-${String(target.month + 1).padStart(2, "0")}`;
      const dueDate = new Date(target.year, target.month, lease.dueDay, 12, 0, 0);

      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);

      if (today < triggerDate) continue;

      await prisma.invoice.upsert({
        where: {
          leaseId_period: { leaseId: lease.id, period },
        },
        update: {},
        create: {
          leaseId: lease.id,
          period,
          dueDate,
          amount: lease.rentAmount,
          balance: lease.rentAmount,
          status: "PENDING",
        },
      });

      createdOrEnsured++;
    }

    res.json({ message: "Upcoming invoices generated/ensured", createdOrEnsured });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to generate upcoming invoices" });
  }
});

/* =========================
   Reports
========================= */

// ✅ Monthly report (includes payment methods)
app.get("/reports/monthly", async (req, res) => {
  try {
    const period = String(req.query.period || "");
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: "period required (YYYY-MM)" });
    }

    const invoices = await prisma.invoice.findMany({
      where: { period },
      include: {
        // ✅ FIX: payments belongs to invoice, NOT to lease
        payments: true,
        lease: {
          include: {
            unit: true,
            tenant: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    });

    const items = invoices.map((inv) => {
      const methods = (inv.payments || [])
        .map((p) => p.method)
        .filter(Boolean);

      const uniqueMethods = [...new Set(methods)];

      return {
        invoiceId: inv.id,
        period: inv.period,
        dueDate: inv.dueDate,
        status: inv.status,
        amount: inv.amount,
        balance: inv.balance,
        paid: inv.amount - inv.balance,

        // ✅ para mostrar "cash, zelle, transfer..."
        paymentMethods: uniqueMethods,
        paymentMethodText: uniqueMethods.join(", "),

        leaseId: inv.leaseId,
        unitCode: inv.lease?.unit?.code || null,
        tenantName: inv.lease?.tenant?.name || null,
        tenantPhone: inv.lease?.tenant?.phone || null,
      };
    });

    const totals = {
      period,
      totalUnits: items.length,
      totalBilled: items.reduce((s, x) => s + x.amount, 0),
      totalPaid: items.reduce((s, x) => s + x.paid, 0),
      totalBalance: items.reduce((s, x) => s + x.balance, 0),
      paidCount: items.filter((x) => x.balance === 0).length,
      oweCount: items.filter((x) => x.balance > 0).length,
      overdueCount: items.filter((x) => x.status === "OVERDUE" && x.balance > 0).length,
    };

    res.json({ totals, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to build monthly report" });
  }
});

// ⚠️ SOLO PARA DESARROLLO: borra toda la data
app.post("/dev/reset", async (req, res) => {
  try {
    // Orden importante por llaves foráneas (FK)
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.unit.deleteMany({});

    res.json({ ok: true, message: "Database cleaned ✅" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================
   Start
========================= */

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
