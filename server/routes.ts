import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import PDFDocument from "pdfkit";

// Helper to check role
const requireRole = (role: string) => {
  return async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const userId = req.user?.claims?.sub;
    const profile = await storage.getProfile(userId);
    
    if (!profile) return res.status(403).json({ message: "Profile not found" });
    if (profile.role !== role && profile.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    
    req.profile = profile;
    next();
  };
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup Object Storage
  registerObjectStorageRoutes(app);

  // === Auth / Profile ===
  app.get(api.auth.me.path, async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.claims.sub;
    let profile = await storage.getProfile(userId);
    
    // Auto-link pending profiles by email
    if (!profile) {
      const pendingProfile = await storage.getProfileByEmail(req.user.claims.email);
      if (pendingProfile && pendingProfile.userId.startsWith("pending:")) {
        profile = await storage.createProfile({
          id: pendingProfile.id,
          userId: req.user.claims.sub,
          name: `${req.user.claims.first_name || ''} ${req.user.claims.last_name || ''}`.trim() || req.user.claims.email || 'User',
        });
      }
    }
    
    // Auto-create profile if first login (optional, or manual)
    // For now, if no profile, we create one with role 'engineer' by default or 'admin' if first user
    if (!profile) {
      const allProfiles = await storage.getAllProfiles();
      const role = allProfiles.length === 0 ? "admin" : "engineer";
      
      const claims = req.user.claims;
      profile = await storage.createProfile({
        userId,
        email: claims.email,
        name: `${claims.first_name || ''} ${claims.last_name || ''}`.trim() || claims.email || 'User',
        role
      });
    }
    
    res.json(profile);
  });

  // === Inventory ===
  app.get(api.inventory.list.path, async (req, res) => {
    const items = await storage.getAllInventory();
    res.json(items);
  });

  app.post(api.inventory.create.path, requireRole("admin"), async (req, res) => {
    try {
      const input = api.inventory.create.input.parse(req.body);
      const item = await storage.createInventoryItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.inventory.update.path, requireRole("admin"), async (req, res) => {
    const id = parseInt(req.params.id);
    const input = api.inventory.update.input.parse(req.body);
    const item = await storage.updateInventoryItem(id, input);
    res.json(item);
  });

  app.delete(api.inventory.delete.path, requireRole("admin"), async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteInventoryItem(id);
    res.status(204).end();
  });

  // === Service Requests ===
  app.get(api.serviceRequests.list.path, async (req: any, res) => {
    // If engineer, show only assigned? Or all?
    // Requirement: "View assigned service requests"
    const requests = await storage.getAllServiceRequests();
    
    if (req.user) {
       const userId = req.user.claims.sub;
       const profile = await storage.getProfile(userId);
       if (profile && profile.role === "engineer") {
         // Filter assigned
         // For now, return all, frontend can filter or we implement filtering here.
         // Let's return all for simplicity or filter in DB.
         // Since getAllServiceRequests returns all, let's just return all for Admin/Account.
         // For Engineer, strictly speaking should filter.
         // Let's filter in memory for now.
         const assignedRequests = requests.filter(r => r.assignedToId === userId || !r.assignedToId); // Show unassigned too so they can pick? Or Admin assigns?
         // Admin creates and assigns.
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
    const request = await storage.updateServiceRequest(id, input);
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

  // === Dashboard ===
  app.get(api.reports.dashboard.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // === Users ===
  app.get(api.users.list.path, requireRole("admin"), async (req, res) => {
    const profiles = await storage.getAllProfiles();
    res.json(profiles);
  });

  app.patch("/api/users/:id/role", requireRole("admin"), async (req, res) => {
    try {
      const { role } = z.object({ role: z.enum(["admin", "engineer", "account"]) }).parse(req.body);
      const profile = await storage.createProfile({
        id: parseInt(req.params.id),
        role
      });
      res.json(profile);
    } catch (err) {
      res.status(400).json({ message: "Invalid role" });
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
        userId: `pending:${email}`, // Placeholder until they log in
        email,
        name,
        role
      });
      res.status(201).json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  // === Reports (PDF) ===
  app.get(api.reports.generate.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const request = await storage.getServiceRequestWithDetails(id);
    if (!request) return res.status(404).json({ message: "Not found" });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=service-report-${id}.pdf`);
    
    doc.pipe(res);
    
    doc.fontSize(20).text('Drone Service Center - Service Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Request ID: ${request.id}`);
    doc.text(`Date: ${request.createdAt?.toLocaleDateString()}`);
    doc.text(`Status: ${request.status}`);
    doc.moveDown();
    
    doc.text('Pilot Details:', { underline: true });
    doc.text(`Name: ${request.pilotName}`);
    doc.text(`Address: ${request.pilotAddress}`);
    doc.text(`Contact: ${request.contactDetails}`);
    doc.moveDown();
    
    doc.text('Drone Details:', { underline: true });
    doc.text(`Drone No: ${request.droneNo}`);
    doc.text(`Serial No: ${request.droneSerial}`);
    doc.text(`Complaint: ${request.complaint}`);
    doc.moveDown();
    
    doc.text('Parts Consumed:', { underline: true });
    if (request.parts && request.parts.length > 0) {
      for (const part of request.parts) {
        // Need to fetch item name... 
        // For now just ID and Qty
        doc.text(`- Item ID: ${part.inventoryId}, Qty: ${part.quantity}`);
      }
    } else {
      doc.text('No parts consumed.');
    }
    
    doc.end();
  });

  return httpServer;
}
