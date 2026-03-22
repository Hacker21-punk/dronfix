import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { verifyToken, hashPassword, comparePassword, generateToken } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";

// ── Multer for file uploads ──────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── JWT Auth Middleware ──────────────────────────────────────────────────────
function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) return res.status(401).json({ message: "Invalid or expired token" });

  (req as any).user = payload; // { userId, role }
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export async function registerRoutes(app: Express) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) return res.status(401).json({ message: "Invalid email or password" });

      const valid = await comparePassword(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });

      const token = generateToken({ userId: user.id, role: user.role });
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/register", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already registered" });

      const hashedPw = await hashPassword(password);
      const user = await storage.createUser({ name, email, password: hashedPw, role });
      res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", jwtAuth, async (req: Request, res: Response) => {
    const user = await storage.getUserById((req as any).user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  // ── Users ────────────────────────────────────────────────────────────────
  app.get("/api/users", jwtAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    const usersList = await storage.getAllUsers();
    res.json(usersList);
  });

  app.put("/api/users/:id", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    const user = await storage.updateUser(String(req.params.id), req.body);
    res.json(user);
  });

  app.delete("/api/users/:id", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    await storage.deleteUser(String(req.params.id));
    res.status(204).send();
  });

  // ── Inventory (admin only) ───────────────────────────────────────────────
  app.get("/api/inventory", jwtAuth, requireRole("admin"), async (_req: Request, res: Response) => {
    res.json(await storage.getAllInventory());
  });

  app.post("/api/inventory", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    const item = await storage.createInventoryItem(req.body);
    res.status(201).json(item);
  });

  app.put("/api/inventory/:id", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    const item = await storage.updateInventoryItem(Number(req.params.id), req.body);
    res.json(item);
  });

  app.delete("/api/inventory/:id", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    await storage.deleteInventoryItem(Number(req.params.id));
    res.status(204).send();
  });

  // ── Service Requests ─────────────────────────────────────────────────────
  app.get("/api/service-requests", jwtAuth, async (req: Request, res: Response) => {
    const { role, userId } = (req as any).user;
    const requests = await storage.getAllServiceRequests(role, userId);
    res.json(requests);
  });

  app.get("/api/service-requests/:id", jwtAuth, async (req: Request, res: Response) => {
    const detail = await storage.getServiceRequestWithDetails(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: "Not found" });
    res.json(detail);
  });

  app.post("/api/service-requests", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const request = await storage.createServiceRequest(req.body);

      // Create parts_requested if provided
      if (req.body.partsRequested && Array.isArray(req.body.partsRequested)) {
        await storage.addPartsRequested(request.id, req.body.partsRequested);
      }

      res.status(201).json(request);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/service-requests/:id", jwtAuth, async (req: Request, res: Response) => {
    const request = await storage.updateServiceRequest(Number(req.params.id), req.body);
    res.json(request);
  });

  app.patch("/api/service-requests/:id/assign", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    const request = await storage.assignEngineer(Number(req.params.id), req.body.engineerId);
    res.json(request);
  });

  app.delete("/api/service-requests/:id", jwtAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      await storage.deleteServiceRequest(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Documents ────────────────────────────────────────────────────────────
  app.post("/api/service-requests/:id/documents", jwtAuth, async (req: Request, res: Response) => {
    const { type, fileUrl } = req.body;
    const uploadedBy = (req as any).user.userId;
    const doc = await storage.addDocument(Number(req.params.id), type, fileUrl, uploadedBy);
    res.status(201).json(doc);
  });

  app.get("/api/service-requests/:id/documents", jwtAuth, async (req: Request, res: Response) => {
    const docs = await storage.getDocuments(Number(req.params.id));
    res.json(docs);
  });

  // ── Images ───────────────────────────────────────────────────────────────
  app.post("/api/service-requests/:id/images", jwtAuth, async (req: Request, res: Response) => {
    const { fileUrl, type, latitude, longitude, capturedAt } = req.body;
    const image = await storage.addImage(Number(req.params.id), type, fileUrl, { latitude, longitude, capturedAt });
    res.status(201).json(image);
  });

  // ── Parts Consumed ───────────────────────────────────────────────────────
  app.post("/api/service-requests/:id/parts", jwtAuth, async (req: Request, res: Response) => {
    try {
      const consumed = await storage.consumePart(Number(req.params.id), req.body.inventoryId, req.body.quantity);
      res.status(201).json(consumed);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Expenses ─────────────────────────────────────────────────────────────
  app.get("/api/service-requests/:id/expenses", jwtAuth, async (req: Request, res: Response) => {
    res.json(await storage.getExpenses(Number(req.params.id)));
  });

  app.post("/api/service-requests/:id/expenses", jwtAuth, async (req: Request, res: Response) => {
    try {
      const expense = await storage.addExpense(Number(req.params.id), req.body);
      res.status(201).json(expense);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/service-requests/:id/expenses/:expenseId", jwtAuth, async (req: Request, res: Response) => {
    const expense = await storage.updateExpense(Number(req.params.expenseId), req.body);
    res.json(expense);
  });

  app.delete("/api/service-requests/:id/expenses/:expenseId", jwtAuth, async (req: Request, res: Response) => {
    await storage.deleteExpense(Number(req.params.expenseId));
    res.json({ ok: true });
  });

  // ── Invoices ─────────────────────────────────────────────────────────────
  app.post("/api/service-requests/:id/invoice", jwtAuth, requireRole("admin", "account"), async (req: Request, res: Response) => {
    try {
      const invoice = await storage.createInvoice(Number(req.params.id), req.body);
      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/service-requests/:id/invoice", jwtAuth, async (req: Request, res: Response) => {
    const invoice = await storage.getInvoice(Number(req.params.id));
    res.json(invoice);
  });

  // ── Logistics ────────────────────────────────────────────────────────────
  app.patch("/api/service-requests/:id/logistics", jwtAuth, requireRole("admin", "logistics"), async (req: Request, res: Response) => {
    try {
      const result = await storage.upsertLogistics(Number(req.params.id), req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Billed Requests ──────────────────────────────────────────────────────
  app.get("/api/billed-requests", jwtAuth, requireRole("admin", "account"), async (_req: Request, res: Response) => {
    res.json(await storage.getBilledRequests());
  });

  // ── Aadhaar OTP Verification ────────────────────────────────────────────
  app.post("/api/service-requests/:id/aadhaar/send-otp", jwtAuth, async (req: Request, res: Response) => {
    try {
      const { aadhaarNumber, consent } = req.body;
      const serviceRequestId = Number(req.params.id);

      if (consent !== true) {
        return res.status(400).json({ message: "Explicit user consent is mandatory for Aadhaar verification" });
      }

      const { aadhaarService } = await import("./services/aadhaar");

      if (!aadhaarService.validateAadhaar(aadhaarNumber)) {
        return res.status(400).json({ message: "Invalid Aadhaar number format" });
      }

      // Check existing verification
      const existing = await storage.getAadhaarVerification(serviceRequestId);
      if (existing?.locked) {
        return res.status(400).json({ message: "Aadhaar already verified and locked" });
      }
      if (existing && existing.retryCount >= 3) {
        return res.status(429).json({ message: "Maximum OTP retries exceeded" });
      }

      const result = await aadhaarService.sendOtp(aadhaarNumber, consent);
      const maskedAadhaar = aadhaarService.maskAadhaar(aadhaarNumber);

      if (existing) {
        await storage.updateAadhaarVerification(existing.id, {
          maskedAadhaar,
          providerTransactionId: result.providerTransactionId,
          consentGiven: true,
          consentTimestamp: new Date(),
          otpExpiresAt: result.expiresAt,
          retryCount: (existing.retryCount || 0) + 1,
        });
      } else {
        await storage.createAadhaarVerification(serviceRequestId, {
          maskedAadhaar,
          providerTransactionId: result.providerTransactionId,
          consentGiven: true,
          consentTimestamp: new Date(),
          otpExpiresAt: result.expiresAt,
        });
      }

      res.json({ success: true, message: result.message, maskedAadhaar });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/service-requests/:id/aadhaar/verify-otp", jwtAuth, async (req: Request, res: Response) => {
    try {
      const { otp } = req.body;
      const serviceRequestId = Number(req.params.id);

      const { aadhaarService } = await import("./services/aadhaar");

      const verification = await storage.getAadhaarVerification(serviceRequestId);
      if (!verification) return res.status(404).json({ message: "No OTP session found" });
      if (verification.locked) return res.status(400).json({ message: "Already verified and locked" });
      if (!verification.providerTransactionId) return res.status(400).json({ message: "Invalid provider transaction state" });

      const result = await aadhaarService.verifyOtp(verification.providerTransactionId, otp);

      if (result.success) {
        await storage.updateAadhaarVerification(verification.id, {
          verified: true,
          verifiedAt: new Date(),
          locked: true,
        });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/service-requests/:id/aadhaar", jwtAuth, async (req: Request, res: Response) => {
    const v = await storage.getAadhaarVerification(Number(req.params.id));
    res.json(v || { verified: false });
  });

  // ── Secure Service Completion ─────────────────────────────────────────────
  app.post("/api/service-requests/:id/complete-secure", jwtAuth, requireRole("engineer"), async (req: Request, res: Response) => {
    try {
      const serviceRequestId = Number(req.params.id);
      const { aadhaarMasked, signatureData, assistedSignature, geoPhotoData, latitude, longitude } = req.body;

      // Validate all mandatory fields
      if (!aadhaarMasked) return res.status(400).json({ message: "Aadhaar verification is mandatory" });
      if (!signatureData) return res.status(400).json({ message: "Customer signature is mandatory" });
      if (!geoPhotoData) return res.status(400).json({ message: "Geo-tagged customer photo is mandatory" });
      if (!latitude || !longitude) return res.status(400).json({ message: "GPS coordinates are mandatory" });

      // Ensure service request is in_progress
      const sr = await storage.getServiceRequestWithDetails(serviceRequestId);
      if (!sr) return res.status(404).json({ message: "Service request not found" });
      if (sr.status !== "in_progress") {
        return res.status(400).json({ message: "Service request must be in_progress to complete" });
      }

      // Check if already completed
      const existing = await storage.getServiceCompletion(serviceRequestId);
      if (existing) return res.status(400).json({ message: "Service already completed with secure closure" });

      // Create the secure completion record
      const completion = await storage.createServiceCompletion(serviceRequestId, {
        aadhaarMasked,
        signatureData,
        assistedSignature: assistedSignature || false,
        geoPhotoData,
        latitude: String(latitude),
        longitude: String(longitude),
        photoTimestamp: new Date().toISOString(),
      });

      // Mark the service request as completed
      await storage.updateServiceRequest(serviceRequestId, {
        status: "completed",
      });

      console.log(`[Secure Completion] Service Request #${serviceRequestId} completed with full verification.`);
      res.json({ success: true, completion });
    } catch (err: any) {
      console.error("[Secure Completion Error]", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/service-requests/:id/service-completion", jwtAuth, async (req: Request, res: Response) => {
    const completion = await storage.getServiceCompletion(Number(req.params.id));
    res.json(completion || null);
  });

  // ── Job Cards ───────────────────────────────────────────────────────────
  app.get("/api/service-requests/:id/job-card", jwtAuth, async (req: Request, res: Response) => {
    const card = await storage.getJobCard(Number(req.params.id));
    res.json(card);
  });

  app.put("/api/service-requests/:id/job-card", jwtAuth, async (req: Request, res: Response) => {
    try {
      const serviceRequestId = Number(req.params.id);
      const userId = (req as any).user.userId;

      const existing = await storage.getJobCard(serviceRequestId);
      if (existing?.locked) {
        // Only engineers can edit locked cards, and we log it
        const role = (req as any).user.role;
        if (role !== "engineer") return res.status(403).json({ message: "Job card is locked" });

        // Log each changed field
        for (const key of Object.keys(req.body)) {
          if (key !== 'locked' && (existing as any)[key] !== req.body[key]) {
            await storage.addEditLog({
              entityType: "job_card",
              entityId: existing.id,
              field: key,
              oldValue: String((existing as any)[key] || ""),
              newValue: String(req.body[key] || ""),
              editedBy: userId,
            });
          }
        }
      }

      const card = await storage.upsertJobCard(serviceRequestId, {
        ...req.body,
        filledBy: userId,
      });
      res.json(card);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Feedback Forms ──────────────────────────────────────────────────────
  app.get("/api/service-requests/:id/feedback", jwtAuth, async (req: Request, res: Response) => {
    const form = await storage.getFeedbackForm(Number(req.params.id));
    res.json(form);
  });

  app.put("/api/service-requests/:id/feedback", jwtAuth, async (req: Request, res: Response) => {
    try {
      const form = await storage.upsertFeedbackForm(Number(req.params.id), req.body);
      res.json(form);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Signatures ──────────────────────────────────────────────────────────
  app.get("/api/service-requests/:id/signatures", jwtAuth, async (req: Request, res: Response) => {
    const sigs = await storage.getSignatures(Number(req.params.id));
    res.json(sigs);
  });

  app.post("/api/service-requests/:id/signatures", jwtAuth, async (req: Request, res: Response) => {
    try {
      const { type, signatureData } = req.body;
      const sig = await storage.upsertSignature(Number(req.params.id), type, signatureData);
      res.json(sig);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Edit Logs ───────────────────────────────────────────────────────────
  app.get("/api/edit-logs/:entityType/:entityId", jwtAuth, async (req: Request, res: Response) => {
    const logs = await storage.getEditLogs(String(req.params.entityType), Number(req.params.entityId));
    res.json(logs);
  });

  // ── Dashboard Stats ──────────────────────────────────────────────────────
  app.get("/api/dashboard/stats", jwtAuth, async (req: Request, res: Response) => {
    const { role, userId } = (req as any).user;
    res.json(await storage.getDashboardStats(role, userId));
  });

  // ── File Upload ──────────────────────────────────────────────────────────
  app.post("/api/upload", jwtAuth, upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl, // Keep for backwards compatibility if needed
      uploadURL: fileUrl,
      objectPath: fileUrl,
      metadata: {
        name: req.file.originalname,
        size: req.file.size,
        contentType: req.file.mimetype
      }
    });
  });

  // ── Pincode Lookup ───────────────────────────────────────────────────────
  app.get("/api/pincode/:pincode", async (req: Request, res: Response) => {
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${req.params.pincode}`);
      const data = await resp.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        res.json({ success: true, state: po.State, district: po.District });
      } else {
        res.json({ success: false });
      }
    } catch {
      res.json({ success: false });
    }
  });

  // ── PDF Report ───────────────────────────────────────────────────────────
  app.get("/api/service-requests/:id/report", jwtAuth, async (req: Request, res: Response) => {
    try {
      const detail = await storage.getServiceRequestWithDetails(Number(req.params.id));
      if (!detail) return res.status(404).json({ message: "Not found" });

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=SR-${detail.id}-report.pdf`);
      doc.pipe(res);

      // Header
      doc.fontSize(20).font("Helvetica-Bold").text("DroneFix Service Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).font("Helvetica").text(`SR #${detail.id.toString().padStart(4, "0")}`, { align: "center" });
      doc.moveDown(2);

      // Service Details
      doc.fontSize(14).font("Helvetica-Bold").text("Service Details");
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      const info = [
        ["Pilot Name", detail.pilotName],
        ["Drone Number", detail.droneNumber],
        ["Serial Number", detail.serialNumber],
        ["Contact", detail.contactDetails],
        ["Address", detail.address],
        ["Location", [detail.district, detail.state, detail.pincode].filter(Boolean).join(", ")],
        ["Service Type", detail.serviceType],
        ["Status", detail.status],
        ["Complaint", detail.complaint],
      ];
      for (const [label, value] of info) {
        doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value || "-"));
      }

      // Documents
      if (detail.documents?.length > 0) {
        doc.moveDown(2).fontSize(14).font("Helvetica-Bold").text("Documents");
        doc.moveDown(0.5).fontSize(10).font("Helvetica");
        for (const d of detail.documents) {
          doc.text(`• ${d.type}: ${d.fileUrl}`);
        }
      }

      // Parts Consumed
      if (detail.partsConsumed?.length > 0) {
        doc.moveDown(2).fontSize(14).font("Helvetica-Bold").text("Parts Consumed");
        doc.moveDown(0.5).fontSize(10).font("Helvetica");
        for (const p of detail.partsConsumed) {
          doc.text(`• ${(p as any).itemName || "Item"} — Qty: ${p.quantityUsed}`);
        }
      }

      // Expenses
      if (detail.expenses?.length > 0) {
        doc.moveDown(2).fontSize(14).font("Helvetica-Bold").text("Expenses");
        doc.moveDown(0.5).fontSize(10).font("Helvetica");
        let totalExpense = 0;
        for (const e of detail.expenses) {
          const amt = Number(e.amount);
          totalExpense += amt;
          doc.text(`• ${e.description} — ₹${amt.toFixed(2)} (${e.paymentMode})`);
        }
        doc.font("Helvetica-Bold").text(`Total Expenses: ₹${totalExpense.toFixed(2)}`);
      }

      // Invoice
      if (detail.invoice) {
        doc.moveDown(2).fontSize(14).font("Helvetica-Bold").text("Invoice Details");
        doc.moveDown(0.5).fontSize(10).font("Helvetica");
        doc.text(`Invoice #: ${detail.invoice.invoiceNumber}`);
        doc.text(`Challan #: ${detail.invoice.challanNumber || "-"}`);
        doc.text(`Value: ₹${Number(detail.invoice.invoiceValue).toFixed(2)}`);
        if (detail.invoice.reimbursementAmount) {
          doc.text(`Reimbursement: ₹${Number(detail.invoice.reimbursementAmount).toFixed(2)}`);
        }
      }

      // Logistics
      if (detail.logistics) {
        doc.moveDown(2).fontSize(14).font("Helvetica-Bold").text("Shipping Details");
        doc.moveDown(0.5).fontSize(10).font("Helvetica");
        doc.text(`Partner: ${detail.logistics.shippingPartner}`);
        doc.text(`Docket: ${detail.logistics.docketNumber || "-"}`);
        doc.text(`Status: ${detail.logistics.shippingStatus || "-"}`);
      }

      doc.end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Serve uploaded files
  app.use("/uploads", (await import("express")).default.static(uploadsDir));
}