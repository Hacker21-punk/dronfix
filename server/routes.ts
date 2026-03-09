import type { Express } from "express";
import { type Server } from "http";
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

    if (req.user) {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (profile && profile.role === "engineer") {
        const myRequests = requests.filter(
          (r) => r.assignedToId === userId
        );
        return res.json(myRequests);
      }
    }

    res.json(requests);
  });

  app.get(api.serviceRequests.get.path, async (req, res) => {
    const id = parseId(req.params.id);

    const request = await storage.getServiceRequestWithDetails(id);

    if (!request) {
      return res.status(404).json({ message: "Not found" });
    }

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
    const id = parseId(req.params.id);

    const input = api.serviceRequests.update.input.parse(req.body);

    const request = await storage.updateServiceRequest(id, input as any);

    res.json(request);
  });

  app.patch(api.serviceRequests.assign.path, requireRole("admin"), async (req, res) => {
    const id = parseId(req.params.id);

    const { engineerId } = req.body;

    const request = await storage.updateServiceRequest(id, {
      assignedToId: engineerId,
    });

    res.json(request);
  });

  /*
  |--------------------------------------------------------------------------
  | Service Images
  |--------------------------------------------------------------------------
  */

  app.post(api.serviceImages.upload.path, async (req, res) => {
    const id = parseId(req.params.id);

    const { imageUrl, type } = req.body;

    const image = await storage.addServiceImage({
      serviceRequestId: id,
      imageUrl,
      type,
    });

    res.status(201).json(image);
  });

  /*
  |--------------------------------------------------------------------------
  | Parts Consumed
  |--------------------------------------------------------------------------
  */

  app.post(api.partsConsumed.add.path, async (req, res) => {
    const id = parseId(req.params.id);

    const { inventoryId, quantity } = req.body;

    try {
      const part = await storage.addPartConsumed({
        serviceRequestId: id,
        inventoryId,
        quantity,
      });

      res.status(201).json(part);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Engineer Expenses
  |--------------------------------------------------------------------------
  */

  app.get("/api/service-requests/:id/expenses", async (req: any, res) => {
    try {
      const id = parseId(req.params.id);

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

      if (!profile || profile.role !== "engineer") {
        return res.status(403).json({
          message: "Only engineers can add expenses",
        });
      }

      const id = parseId(req.params.id);

      const data = z
        .object({
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
        })
        .parse(req.body);

      if (data.billStatus && !data.billImageUrl) {
        return res.status(400).json({
          message: "Bill image required when bill status YES",
        });
      }

      if (data.onlineSlip && !data.onlineSlipImageUrl) {
        return res.status(400).json({
          message: "Online slip image required when online slip YES",
        });
      }

      const modeOfPayment = data.onlineSlip ? "Online" : "Cash";

      const expense = await storage.addExpense({
        serviceRequestId: id,
        engineerId: userId,
        date: new Date(data.date),
        description: data.description,
        amount: data.amount,
        billStatus: data.billStatus,
        billImageUrl: data.billStatus ? data.billImageUrl || null : null,
        onlineSlip: data.onlineSlip,
        onlineSlipImageUrl: data.onlineSlip
          ? data.onlineSlipImageUrl || null
          : null,
        modeOfPayment,
        modeOfTravel: data.modeOfTravel,
        baseLocation: data.baseLocation,
        remark: data.remark || null,
      });

      res.status(201).json(expense);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          message: e.errors[0].message,
        });
      }

      res.status(500).json({ message: e.message });
    }
  });

    /*
  |--------------------------------------------------------------------------
  | Update Expense
  |--------------------------------------------------------------------------
  */

  app.put("/api/service-requests/:id/expenses/:expenseId", async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user?.claims?.sub;
      const profile = userId ? await storage.getProfile(userId) : null;

      if (!profile || profile.role !== "engineer") {
        return res.status(403).json({
          message: "Only engineers can edit expenses",
        });
      }

      const expenseId = parseId(req.params.expenseId);

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

      const modeOfPayment = data.onlineSlip ? "Online" : "Cash";

      const updated = await storage.updateExpense(expenseId, {
        date: new Date(data.date),
        description: data.description,
        amount: data.amount,
        billStatus: data.billStatus,
        billImageUrl: data.billStatus ? data.billImageUrl || null : null,
        onlineSlip: data.onlineSlip,
        onlineSlipImageUrl: data.onlineSlip
          ? data.onlineSlipImageUrl || null
          : null,
        modeOfPayment,
        modeOfTravel: data.modeOfTravel,
        baseLocation: data.baseLocation,
        remark: data.remark || null,
      });

      if (!updated) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json(updated);

    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0].message });
      }

      res.status(500).json({ message: e.message });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Delete Expense
  |--------------------------------------------------------------------------
  */

  app.delete("/api/service-requests/:id/expenses/:expenseId", async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user?.claims?.sub;
      const profile = userId ? await storage.getProfile(userId) : null;

      if (!profile || profile.role !== "engineer") {
        return res.status(403).json({
          message: "Only engineers can delete expenses",
        });
      }

      const expenseId = parseId(req.params.expenseId);

      await storage.deleteExpense(expenseId);

      res.json({ success: true });

    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Dashboard Stats
  |--------------------------------------------------------------------------
  */

  app.get(api.reports.dashboard.path, async (req: any, res) => {
    let engineerId: string | undefined;

    if (req.user) {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (profile && profile.role === "engineer") {
        engineerId = userId;
      }
    }

    const stats = await storage.getDashboardStats(engineerId);

    res.json(stats);
  });

  /*
  |--------------------------------------------------------------------------
  | Users
  |--------------------------------------------------------------------------
  */

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

      const profile = await storage.updateProfile(parseId(req.params.id), data);

      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(profile);

    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }

      res.status(400).json({ message: "Invalid data" });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Invoice Submission (Accounts)
  |--------------------------------------------------------------------------
  */

  const invoiceSubmitSchema = z.object({
    invoiceNumber: z.string().min(1),
    challanNumber: z.string().optional(),
    invoiceValue: z.string().min(1),
    reimbursementAmount: z.string().optional(),
    invoiceType: z.enum(["L1", "L2", "L3"]),
    invoiceDate: z.string().min(1),
  });

  app.patch("/api/service-requests/:id/invoice", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (!profile || (profile.role !== "account" && profile.role !== "admin")) {
        return res.status(403).json({
          message: "Only accounts team can generate invoices",
        });
      }

      const data = invoiceSubmitSchema.parse(req.body);

      const updated = await storage.updateServiceRequest(parseId(req.params.id), {
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

  /*
  |--------------------------------------------------------------------------
  | Logistics Update
  |--------------------------------------------------------------------------
  */

  const logisticsSubmitSchema = z.object({
    shippingPartnerName: z.string().min(1),
    docketDetails: z.string().optional(),
    shippingDate: z.string().min(1),
    shippingStatus: z.enum(["shipped", "in_transit", "delivered"]),
  });

  app.patch("/api/service-requests/:id/logistics", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);

      if (!profile || (profile.role !== "logistics" && profile.role !== "admin")) {
        return res.status(403).json({
          message: "Only logistics team can update shipping",
        });
      }

      const data = logisticsSubmitSchema.parse(req.body);

      const updated = await storage.updateServiceRequest(parseId(req.params.id), {
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

  /*
  |--------------------------------------------------------------------------
  | Pincode Lookup
  |--------------------------------------------------------------------------
  */

  app.get("/api/pincode/:pincode", async (req, res) => {
    const { pincode } = req.params;

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        message: "Invalid pincode",
      });
    }

    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`
      );

      const data = await response.json();

      if (data && data[0] && data[0].Status === "Success") {
        const po = data[0].PostOffice[0];

        return res.json({
          success: true,
          state: po.State,
          district: po.District,
          pincode,
        });
      }

      res.json({ success: false });

    } catch (err) {
      res.status(500).json({
        success: false,
      });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  app.get("/api/logout", (req, res) => {
    res.redirect("/");
  });

  return httpServer;
}