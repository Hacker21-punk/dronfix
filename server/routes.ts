import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { hashPassword, comparePassword, generateToken } from "./auth";

/*
|--------------------------------------------------------------------------
| Fake Auth Middleware (Local Dev Only)
|--------------------------------------------------------------------------
*/

const fakeAuth = async (req: any, res: any, next: any) => {
  req.user = {
    claims: {
      sub: "local-user",
      email: "admin@test.com",
      first_name: "Local",
      last_name: "Admin",
    },
  };

  req.isAuthenticated = () => true;

  next();
};

/*
|--------------------------------------------------------------------------
| Role Middleware
|--------------------------------------------------------------------------
*/

const requireRole = (role: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);

      if (!profile) {
        return res.status(403).json({ message: "Profile not found" });
      }

      if (profile.role !== role && profile.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.profile = profile;

      next();
    } catch (err) {
      console.error("Role middleware error:", err);
      res.status(500).json({ message: "Authorization error" });
    }
  };
};

/*
|--------------------------------------------------------------------------
| Utility Helpers
|--------------------------------------------------------------------------
*/

function parseId(id: string) {
  const parsed = parseInt(id);
  if (isNaN(parsed)) throw new Error("Invalid ID");
  return parsed;
}

async function fetchObjectAsBuffer(objectPath: string): Promise<Buffer | null> {
  try {
    if (!objectPath) return null;

    if (objectPath.startsWith("http")) {
      const response = await fetch(objectPath);

      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return null;
  } catch (err) {
    console.error("Fetch object error:", err);
    return null;
  }
}

function addSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > 680) doc.addPage();

  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#1a56db").text(title);

  doc.moveTo(doc.x, doc.y)
    .lineTo(doc.x + 500, doc.y)
    .strokeColor("#1a56db")
    .lineWidth(1)
    .stroke();

  doc.moveDown(0.5);
  doc.fillColor("#000");
  doc.fontSize(10);
}

function addFieldRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value || "N/A");
}

/*
|--------------------------------------------------------------------------
| Routes Registration
|--------------------------------------------------------------------------
*/

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(fakeAuth);

  /*
  |--------------------------------------------------------------------------
  | Profile
  |--------------------------------------------------------------------------
  */

  app.get(api.auth.me.path, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      let profile = await storage.getProfile(userId);

      if (!profile) {
        const allProfiles = await storage.getAllProfiles();

        const role = allProfiles.length === 0 ? "admin" : "engineer";

        const claims = req.user.claims;

        profile = await storage.createProfile({
          userId,
          email: claims.email,
          name: `${claims.first_name} ${claims.last_name}`,
          role,
        });
      }

      res.json(profile);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load profile" });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Inventory
  |--------------------------------------------------------------------------
  */

  app.get(api.inventory.list.path, async (_, res) => {
    const items = await storage.getAllInventory();
    res.json(items);
  });

  app.post(api.inventory.create.path, requireRole("admin"), async (req, res) => {
    try {
      const input = api.inventory.create.input.parse(req.body);

      const item = await storage.createInventoryItem(input);

      res.status(201).json(item);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }

      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.inventory.update.path, requireRole("admin"), async (req, res) => {
    try {
      const id = parseId(req.params.id);

      const input = api.inventory.update.input.parse(req.body);

      const item = await storage.updateInventoryItem(id, input);

      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete(api.inventory.delete.path, requireRole("admin"), async (req, res) => {
    try {
      const id = parseId(req.params.id);

      await storage.deleteInventoryItem(id);

      res.status(204).end();
    } catch {
      res.status(400).json({ message: "Invalid ID" });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Bulk Update
  |--------------------------------------------------------------------------
  */

  const bulkUpdateSchema = z.object({
    updates: z.array(
      z.object({
        id: z.number().int().positive(),
        quantity: z.number().int().min(0),
      })
    ),
  });

  app.patch("/api/inventory/bulk-update", requireRole("admin"), async (req, res) => {
    try {
      const parsed = bulkUpdateSchema.parse(req.body);

      let success = 0;

      for (const update of parsed.updates) {
        await storage.updateInventoryItem(update.id, {
          quantity: update.quantity,
        });

        success++;
      }

      res.json({ success });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }

      res.status(500).json({ message: "Bulk update failed" });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Service Requests
  |--------------------------------------------------------------------------
  */

  app.get(api.serviceRequests.list.path, async (req: any, res) => {
    const requests = await storage.getAllServiceRequests();

    const userId = req.user?.claims?.sub;

    if (userId) {
      const profile = await storage.getProfile(userId);

      if (profile?.role === "engineer") {
        return res.json(
          requests.filter((r) => r.assignedToId === userId)
        );
      }
    }

    res.json(requests);
  });

  /*
  |--------------------------------------------------------------------------
  | Reports
  |--------------------------------------------------------------------------
  */

  app.get(api.reports.generate.path, async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseId(req.params.id);

      const request = await storage.getServiceRequestWithDetails(id);

      if (!request) {
        return res.status(404).json({ message: "Not found" });
      }

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
      });

      res.setHeader("Content-Type", "application/pdf");

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=service-report-${id}.pdf`
      );

      doc.pipe(res);

      doc
        .fontSize(22)
        .fillColor("#1a56db")
        .text("DRONE SERVICE CENTER", { align: "center" });

      doc
        .fontSize(16)
        .fillColor("#333")
        .text("Service Report", { align: "center" });

      doc.moveDown();

      addSectionHeader(doc, "Service Details");

      addFieldRow(doc, "Service ID", String(request.id));
      addFieldRow(doc, "Status", request.status);
      addFieldRow(doc, "Type", request.serviceType);

      doc.end();

    } catch (err) {
      console.error("PDF error:", err);

      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // === Service Requests ===
  app.get(api.serviceRequests.list.path, async (req: any, res) => {
    const requests = await storage.getAllServiceRequests();
    
    if (req.user) {
       const userId = req.user.claims.sub;
       const profile = await storage.getProfile(userId);
       if (profile && profile.role === "engineer") {
         const myRequests = requests.filter(r => r.assignedToId === userId);
         return res.json(myRequests);
       }
    }
    res.json(requests);
  });

  app.get(api.serviceRequests.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const request = await storage.getServiceRequestWithDetails(id);
    if (!request) return res.status(404).json({ message: "Not found" });
    res.json(request);
  });

  app.post(api.serviceRequests.create.path, requireRole("admin"), async (req, res) => {
    try {
      const input = api.serviceRequests.create.input.parse(req.body);
      const request = await storage.createServiceRequest(input);
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Error creating request" });
    }
  });

  app.put(api.serviceRequests.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const input = api.serviceRequests.update.input.parse(req.body);
    const request = await storage.updateServiceRequest(id, input as any);
    res.json(request);
  });
  
  app.patch(api.serviceRequests.assign.path, requireRole("admin"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { engineerId } = req.body;
    const request = await storage.updateServiceRequest(id, { assignedToId: engineerId });
    res.json(request);
  });

  // === Service Images ===
  app.post(api.serviceImages.upload.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const { imageUrl, type } = req.body;
    const image = await storage.addServiceImage({
      serviceRequestId: id,
      imageUrl,
      type
    });
    res.status(201).json(image);
  });

  // === Parts Consumed ===
  app.post(api.partsConsumed.add.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const { inventoryId, quantity } = req.body;
    try {
      const part = await storage.addPartConsumed({
        serviceRequestId: id,
        inventoryId,
        quantity
      });
      res.status(201).json(part);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === Engineer Expenses ===
  app.get("/api/service-requests/:id/expenses", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const expenses = await storage.getExpenses(id);
      res.json(expenses);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/service-requests/:id/expenses", async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user?.claims?.sub;
      const profile = userId ? await storage.getProfile(userId) : null;
      if (!profile || profile.role !== 'engineer') {
        return res.status(403).json({ message: "Only engineers can add expenses" });
      }

      const id = parseInt(req.params.id);
      const data = z.object({
        date: z.string(),
        description: z.string().min(1),
        amount: z.string(),
        billStatus: z.boolean(),
        billImageUrl: z.string().nullable().optional(),
        onlineSlip: z.boolean(),
        onlineSlipImageUrl: z.string().nullable().optional(),
        modeOfTravel: z.enum(["Train", "Bus", "Auto", "Flight"]),
        baseLocation: z.string().min(1),
        remark: z.string().nullable().optional(),
      }).parse(req.body);

      if (data.billStatus && !data.billImageUrl) {
        return res.status(400).json({ message: "Bill image is required when bill status is YES" });
      }
      if (data.onlineSlip && !data.onlineSlipImageUrl) {
        return res.status(400).json({ message: "Online slip image is required when online slip is YES" });
      }

      const modeOfPayment = data.onlineSlip ? "Online" : "Cash";

      const expense = await storage.addExpense({
        serviceRequestId: id,
        engineerId: userId,
        date: new Date(data.date),
        description: data.description,
        amount: data.amount,
        billStatus: data.billStatus,
        billImageUrl: data.billStatus ? (data.billImageUrl || null) : null,
        onlineSlip: data.onlineSlip,
        onlineSlipImageUrl: data.onlineSlip ? (data.onlineSlipImageUrl || null) : null,
        modeOfPayment,
        modeOfTravel: data.modeOfTravel,
        baseLocation: data.baseLocation,
        remark: data.remark || null,
      });
      res.status(201).json(expense);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0].message });
      }
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/service-requests/:id/expenses/:expenseId", async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user?.claims?.sub;
      const profile = userId ? await storage.getProfile(userId) : null;
      if (!profile || profile.role !== 'engineer') {
        return res.status(403).json({ message: "Only engineers can edit expenses" });
      }

      const expenseId = parseInt(req.params.expenseId);
      const data = z.object({
        date: z.string(),
        description: z.string().min(1),
        amount: z.string(),
        billStatus: z.boolean(),
        billImageUrl: z.string().nullable().optional(),
        onlineSlip: z.boolean(),
        onlineSlipImageUrl: z.string().nullable().optional(),
        modeOfTravel: z.enum(["Train", "Bus", "Auto", "Flight"]),
        baseLocation: z.string().min(1),
        remark: z.string().nullable().optional(),
      }).parse(req.body);

      if (data.billStatus && !data.billImageUrl) {
        return res.status(400).json({ message: "Bill image is required when bill status is YES" });
      }
      if (data.onlineSlip && !data.onlineSlipImageUrl) {
        return res.status(400).json({ message: "Online slip image is required when online slip is YES" });
      }

      const modeOfPayment = data.onlineSlip ? "Online" : "Cash";

      const updated = await storage.updateExpense(expenseId, {
        date: new Date(data.date),
        description: data.description,
        amount: data.amount,
        billStatus: data.billStatus,
        billImageUrl: data.billStatus ? (data.billImageUrl || null) : null,
        onlineSlip: data.onlineSlip,
        onlineSlipImageUrl: data.onlineSlip ? (data.onlineSlipImageUrl || null) : null,
        modeOfPayment,
        modeOfTravel: data.modeOfTravel,
        baseLocation: data.baseLocation,
        remark: data.remark || null,
      });
      if (!updated) return res.status(404).json({ message: "Expense not found" });
      res.json(updated);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0].message });
      }
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/service-requests/:id/expenses/:expenseId", async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user?.claims?.sub;
      const profile = userId ? await storage.getProfile(userId) : null;
      if (!profile || profile.role !== 'engineer') {
        return res.status(403).json({ message: "Only engineers can delete expenses" });
      }

      const expenseId = parseInt(req.params.expenseId);
      await storage.deleteExpense(expenseId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === Dashboard ===
  app.get(api.reports.dashboard.path, async (req: any, res) => {
    let engineerId: string | undefined;
    if (req.user) {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile && profile.role === 'engineer') {
        engineerId = userId;
      }
    }
    const stats = await storage.getDashboardStats(engineerId);
    res.json(stats);
  });

  // === Users ===
  app.get(api.users.list.path, requireRole("admin"), async (req, res) => {
    const profiles = await storage.getAllProfiles();
    res.json(profiles);
  });

  app.patch("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["admin", "engineer", "account", "logistics"]).optional(),
      }).parse(req.body);

      if (data.email) {
        const existing = await storage.getProfileByEmail(data.email);
        if (existing && existing.id !== parseInt(req.params.id)) {
          return res.status(400).json({ message: `Email "${data.email}" is already used by another user (${existing.name}). Please delete that user first or use a different email.` });
        }
      }

      const profile = await storage.updateProfile(parseInt(req.params.id), data);
      if (!profile) return res.status(404).json({ message: "User not found" });
      res.json(profile);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "This email is already in use by another user." });
      }
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.post(api.users.create.path, requireRole("admin"), async (req, res) => {
    try {
      const { email, name, role } = api.users.create.input.parse(req.body);
      
      // Since we use Replit Auth, we can't "create" a user account, 
      // but we can pre-assign a role to an email address.
      // We'll update our storage to support finding/creating profiles by email.
      const existing = await storage.getProfileByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const profile = await storage.createProfile({
        userId: null, // No user ID yet
        email,
        name,
        role
      });
      res.status(201).json(profile);
    } catch (err: any) {
      console.error("Error creating user:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Error creating user: " + err.message });
    }
  });

  // === Invoice Submission (Accounts) ===
  const invoiceSubmitSchema = z.object({
    invoiceNumber: z.string().min(1, "Invoice number is required"),
    challanNumber: z.string().optional(),
    invoiceValue: z.string().min(1, "Invoice value is required"),
    reimbursementAmount: z.string().optional(),
    invoiceType: z.enum(["L1", "L2", "L3"], { required_error: "Invoice type is required" }),
    invoiceDate: z.string().min(1, "Invoice date is required"),
  });

  app.patch("/api/service-requests/:id/invoice", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = req.user.claims.sub;
    const profile = await storage.getProfile(userId);
    if (!profile || (profile.role !== "account" && profile.role !== "admin")) {
      return res.status(403).json({ message: "Only accounts team can generate invoices" });
    }
    try {
      const data = invoiceSubmitSchema.parse(req.body);
      const id = parseInt(req.params.id);
      const updated = await storage.updateServiceRequest(id, {
        invoiceNumber: data.invoiceNumber,
        challanNumber: data.challanNumber || null,
        invoiceValue: data.invoiceValue,
        reimbursementAmount: data.reimbursementAmount || null,
        invoiceType: data.invoiceType,
        invoiceDate: new Date(data.invoiceDate),
        status: "billed",
      } as any);
      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err.message });
    }
  });

  // === Logistics / Shipping Details ===
  const logisticsSubmitSchema = z.object({
    shippingPartnerName: z.string().min(1, "Shipping partner name is required"),
    docketDetails: z.string().optional(),
    shippingDate: z.string().min(1, "Shipping date is required"),
    shippingStatus: z.enum(["shipped", "in_transit", "delivered"], { required_error: "Shipping status is required" }),
  });

  app.patch("/api/service-requests/:id/logistics", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = req.user.claims.sub;
    const profile = await storage.getProfile(userId);
    if (!profile || (profile.role !== "logistics" && profile.role !== "admin")) {
      return res.status(403).json({ message: "Only logistics team can update shipping details" });
    }
    try {
      const data = logisticsSubmitSchema.parse(req.body);
      const id = parseInt(req.params.id);
      const updated = await storage.updateServiceRequest(id, {
        shippingPartnerName: data.shippingPartnerName,
        docketDetails: data.docketDetails || null,
        shippingDate: new Date(data.shippingDate),
        shippingStatus: data.shippingStatus,
      } as any);
      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err.message });
    }
  });

  // === Billed Data API (Accounts) ===
  app.get("/api/billed-requests", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = req.user.claims.sub;
    const profile = await storage.getProfile(userId);
    if (!profile || (profile.role !== "account" && profile.role !== "admin")) {
      return res.status(403).json({ message: "Only accounts team can view billed data" });
    }
    try {
      const allRequests = await storage.getAllServiceRequests();
      const billedRequests = allRequests.filter(r => r.status === "billed");
      res.json(billedRequests);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
 async function fetchObjectAsBuffer(objectPath: string): Promise<Buffer | null> {
  try {
    if (!objectPath) return null;

    // If it's a URL, fetch it directly
    if (objectPath.startsWith("http")) {
      const response = await fetch(objectPath);

      if (!response.ok) {
        console.error("Failed to fetch file:", objectPath);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // Local object storage paths are not supported in local mode
    if (objectPath.startsWith("/objects/")) {
      console.warn("Local object storage disabled:", objectPath);
      return null;
    }

    return null;
  } catch (err) {
    console.error("Failed to fetch object for report:", objectPath, err);
    return null;
  }
}
  function addSectionHeader(doc: PDFKit.PDFDocument, title: string) {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#1a56db').text(title, { underline: false });
    doc.moveTo(doc.x, doc.y).lineTo(doc.x + 500, doc.y).strokeColor('#1a56db').lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fillColor('#000000');
    doc.fontSize(10);
  }

  function addFieldRow(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(value || 'N/A');
  }

  async function addImageToDoc(doc: PDFKit.PDFDocument, url: string, label: string) {
    const buffer = await fetchObjectAsBuffer(url);
    if (!buffer) {
      doc.addPage();
      doc.fontSize(12).fillColor('#999999').text(`[${label} - unable to load]`, { align: 'center' }).fillColor('#000000');
      return;
    }
    try {
      const header = buffer.slice(0, 8);
      const isPng = header[0] === 0x89 && header[1] === 0x50;
      const isJpeg = header[0] === 0xFF && header[1] === 0xD8;
      const isPdf = header.toString('ascii', 0, 5) === '%PDF-';

      doc.addPage();

      const pageW = 595.28;
      const pageH = 841.89;
      const margin = 50;
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2 - 40;

      doc.fontSize(13).fillColor('#1a56db').text(label, margin, margin, { align: 'center', width: contentW });
      doc.moveTo(margin, doc.y + 4).lineTo(pageW - margin, doc.y + 4).strokeColor('#d0d5dd').lineWidth(0.5).stroke();
      doc.moveDown(0.8);

      if (isPdf) {
        doc.fontSize(11).fillColor('#333333').text('PDF document attached — see separate download', margin, pageH / 2 - 20, { align: 'center', width: contentW });
        doc.fillColor('#000000');
        return;
      }

      if (!isPng && !isJpeg) {
        doc.fontSize(11).fillColor('#333333').text('Document attached — see separate download', margin, pageH / 2 - 20, { align: 'center', width: contentW });
        doc.fillColor('#000000');
        return;
      }

      const imgTopY = doc.y;
      const availH = contentH - (imgTopY - margin);
      const imgW = contentW;
      const imgH = availH;

      doc.image(buffer, margin, imgTopY, { fit: [imgW, imgH], align: 'center', valign: 'center' });
      doc.fillColor('#000000');
    } catch (err) {
      doc.fontSize(11).fillColor('#999999').text(`[${label} - could not embed]`, { align: 'center' }).fillColor('#000000');
    }
  }

  app.get(api.reports.generate.path, async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user?.claims?.sub;
      const profile = userId ? await storage.getProfile(userId) : null;
      if (!profile) return res.status(403).json({ message: "No profile found" });

      const id = parseInt(req.params.id);
      const request = await storage.getServiceRequestWithDetails(id);
      if (!request) return res.status(404).json({ message: "Not found" });

      if (profile.role === 'engineer' && request.assignedToId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=service-report-${id}.pdf`);
      doc.pipe(res);

      // ===== TITLE =====
      doc.fontSize(22).fillColor('#1a56db').text('DRONE SERVICE CENTER', { align: 'center' });
      doc.fontSize(16).fillColor('#333333').text('Service Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a56db').lineWidth(2).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text(`Report #${request.id}  |  Generated: ${new Date().toLocaleDateString('en-IN')}  |  Status: ${request.status.toUpperCase()}`, { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(1);

      // ===== SERVICE REQUEST DETAILS =====
      addSectionHeader(doc, 'Service Request Details');
      doc.fontSize(10);
      addFieldRow(doc, 'Request ID', `${request.id}`);
      addFieldRow(doc, 'Service Type', request.serviceType);
      addFieldRow(doc, 'Status', request.status);
      addFieldRow(doc, 'Created Date', request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-IN') : 'N/A');
      if (request.tentativeServiceDate) {
        addFieldRow(doc, 'Tentative Service Date', new Date(request.tentativeServiceDate).toLocaleDateString('en-IN'));
      }
      if (request.completedAt) {
        addFieldRow(doc, 'Completed Date', new Date(request.completedAt).toLocaleDateString('en-IN'));
      }
      if (request.complaint) {
        addFieldRow(doc, 'Complaint', request.complaint);
      }
      if (request.partsRequested) {
        addFieldRow(doc, 'Parts Requested', request.partsRequested);
      }
      doc.moveDown(0.5);

      // ===== PILOT DETAILS =====
      addSectionHeader(doc, 'Pilot Details');
      doc.fontSize(10);
      addFieldRow(doc, 'Name', request.pilotName);
      addFieldRow(doc, 'Address', request.pilotAddress);
      if (request.state) addFieldRow(doc, 'State', request.state);
      if (request.district) addFieldRow(doc, 'District', request.district);
      addFieldRow(doc, 'Contact', request.contactDetails);
      doc.moveDown(0.5);

      // ===== DRONE DETAILS =====
      addSectionHeader(doc, 'Drone Details');
      doc.fontSize(10);
      addFieldRow(doc, 'Drone No', request.droneNo);
      addFieldRow(doc, 'Serial No', request.droneSerial);
      doc.moveDown(0.5);

      // ===== ASSIGNED ENGINEER =====
      if (request.assignedTo) {
        addSectionHeader(doc, 'Assigned Engineer');
        doc.fontSize(10);
        addFieldRow(doc, 'Name', request.assignedTo.name || 'N/A');
        if (request.assignedTo.email) addFieldRow(doc, 'Email', request.assignedTo.email);
        doc.moveDown(0.5);
      }

      // ===== BEFORE SERVICE IMAGES =====
      const beforeImages = request.images?.filter(img => img.type === 'before') || [];
      if (beforeImages.length > 0) {
        for (let i = 0; i < beforeImages.length; i++) {
          await addImageToDoc(doc, beforeImages[i].imageUrl, `Before Service — Image ${i + 1} of ${beforeImages.length}`);
        }
      }

      // ===== PARTS CONSUMED =====
      addSectionHeader(doc, 'Parts Consumed');
      doc.fontSize(10);
      if (request.parts && request.parts.length > 0) {
        const tableTop = doc.y;
        const col1 = 50, col2 = 200, col3 = 340, col4 = 430;
        doc.font('Helvetica-Bold');
        doc.text('Part Name', col1, tableTop);
        doc.text('SKU', col2, tableTop);
        doc.text('Qty', col3, tableTop);
        doc.text('Unit Price', col4, tableTop);
        doc.moveTo(col1, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#cccccc').lineWidth(0.5).stroke();
        doc.moveDown(0.3);
        doc.font('Helvetica');

        let totalCost = 0;
        for (const part of request.parts) {
          const p = part as any;
          const name = p.item?.name || `Item #${part.inventoryId}`;
          const sku = p.item?.sku || '-';
          const price = parseFloat(p.item?.price) || 0;
          const lineTotal = price * part.quantity;
          totalCost += lineTotal;

          if (doc.y > 700) doc.addPage();
          const rowY = doc.y;
          doc.text(name, col1, rowY);
          doc.text(sku, col2, rowY);
          doc.text(`${part.quantity}`, col3, rowY);
          doc.text(`₹${price.toFixed(2)}`, col4, rowY);
          doc.moveDown(0.3);
        }
        doc.moveTo(col1, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#cccccc').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(`Total Parts Cost: ₹${totalCost.toFixed(2)}`, { align: 'right' });
        doc.font('Helvetica');
      } else {
        doc.text('No parts consumed.');
      }
      doc.moveDown(0.5);

      // ===== ENGINEER EXPENSES =====
      const expenses = await storage.getExpenses(id);
      if (expenses && expenses.length > 0) {
        addSectionHeader(doc, 'Engineer Expenses');
        doc.fontSize(9);

        let totalExpenses = 0;
        expenses.forEach((exp: any, idx: number) => {
          totalExpenses += parseFloat(exp.amount) || 0;
          if (doc.y > 680) doc.addPage();

          doc.font('Helvetica-Bold').fontSize(10);
          doc.text(`Expense #${idx + 1}`, 50, doc.y);
          doc.moveDown(0.2);
          doc.font('Helvetica').fontSize(9);
          addFieldRow(doc, 'Date', exp.date ? new Date(exp.date).toLocaleDateString('en-IN') : '-');
          addFieldRow(doc, 'Description', exp.description || '-');
          addFieldRow(doc, 'Amount', `₹${(parseFloat(exp.amount) || 0).toFixed(2)}`);
          addFieldRow(doc, 'Bill Status', exp.billStatus ? 'YES' : 'NO');
          addFieldRow(doc, 'Online Slip', exp.onlineSlip ? 'YES' : 'NO');
          addFieldRow(doc, 'Mode of Payment', exp.modeOfPayment || '-');
          addFieldRow(doc, 'Mode of Travel', exp.modeOfTravel || '-');
          addFieldRow(doc, 'Base Location', exp.baseLocation || '-');
          if (exp.remark) addFieldRow(doc, 'Remark', exp.remark);
          doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#eeeeee').lineWidth(0.5).stroke();
          doc.moveDown(0.4);
        });
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(10).text(`Total Expenses: ₹${totalExpenses.toFixed(2)}`, { align: 'right' });
        doc.font('Helvetica');
        doc.moveDown(0.5);
      }

      // ===== AFTER SERVICE IMAGES =====
      const afterImages = request.images?.filter(img => img.type === 'after') || [];
      if (afterImages.length > 0) {
        for (let i = 0; i < afterImages.length; i++) {
          await addImageToDoc(doc, afterImages[i].imageUrl, `After Service — Image ${i + 1} of ${afterImages.length}`);
        }
      }

      // ===== DOCUMENTS =====
      const documents = [
        { label: 'Job Sheet', url: request.jobSheetUrl },
        { label: 'Feedback Form', url: request.feedbackFormUrl },
        { label: 'Crash Report', url: request.crashReportUrl },
        { label: 'Audit Report', url: request.auditReportUrl },
        { label: 'Log Report', url: request.logReportUrl },
        { label: 'Invoice', url: request.invoiceUrl },
      ].filter(d => d.url);

      if (documents.length > 0) {
        for (const docItem of documents) {
          await addImageToDoc(doc, docItem.url!, `Document — ${docItem.label}`);
        }
      }

      // ===== BILLING INFO =====
      if (request.billNo || request.invoiceUrl || request.challanUrl) {
        addSectionHeader(doc, 'Billing Information');
        doc.fontSize(10);
        if (request.billNo) addFieldRow(doc, 'Bill No', request.billNo);
        if (request.invoiceUrl) addFieldRow(doc, 'Invoice', 'Attached above');
        if (request.challanUrl) addFieldRow(doc, 'Challan', 'Attached');
        doc.moveDown(0.5);
      }

      // ===== FOOTER =====
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#999999');
        doc.text(
          `Page ${i + 1} of ${pageCount}  |  Drone Service Center  |  Confidential`,
          50, 770, { align: 'center', width: 495 }
        );
      }

      doc.end();
    } catch (err: any) {
      console.error('Report generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to generate report' });
      }
    }
  });
// === Pincode Lookup (India Post API) ===
app.get("/api/pincode/:pincode", async (req, res) => {
  const { pincode } = req.params;

  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ message: "Invalid pincode. Must be 6 digits." });
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();

    if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
      const postOffices = data[0].PostOffice;

      const state = postOffices[0].State;
      const district = postOffices[0].District;

      const areas = postOffices.map((po: any) => ({
        name: po.Name,
        block: po.Block,
        division: po.Division,
      }));

      return res.json({
        success: true,
        state,
        district,
        areas,
        pincode
      });
    }

    return res.json({
      success: false,
      message: "Pincode not found"
    });

  } catch (err) {
    console.error("Pincode lookup error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to lookup pincode"
    });
  }
});


// === Logout (Local Dev Mode) ===
app.get("/api/logout", (req, res) => {
  res.redirect("/");
});


return httpServer;
}
