import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
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
      if (pendingProfile && !pendingProfile.userId) {
        const oidcName = `${req.user.claims.first_name || ''} ${req.user.claims.last_name || ''}`.trim();
        profile = await storage.createProfile({
          id: pendingProfile.id,
          userId: req.user.claims.sub,
          name: pendingProfile.name || oidcName || 'User',
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

  // === Bulk Stock Update ===
  const bulkUpdateSchema = z.object({
    updates: z.array(z.object({
      id: z.number().int().positive(),
      quantity: z.number().int().min(0),
    })).min(1, "At least one update is required"),
  });

  app.patch("/api/inventory/bulk-update", async (req: any, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = req.user.claims.sub;
    const profile = await storage.getProfile(userId);
    if (!profile || (profile.role !== "admin" && profile.role !== "engineer")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const parsed = bulkUpdateSchema.parse(req.body);
      
      let successCount = 0;
      for (const u of parsed.updates) {
        await storage.updateInventoryItem(u.id, { quantity: u.quantity });
        successCount++;
      }
      
      res.json({ success: successCount });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err.message });
    }
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
        role: z.enum(["admin", "engineer", "account"]).optional(),
      }).parse(req.body);
      const profile = await storage.updateProfile(parseInt(req.params.id), data);
      if (!profile) return res.status(404).json({ message: "User not found" });
      res.json(profile);
    } catch (err) {
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

  // === Reports (PDF) ===
  const objectStorageService = new ObjectStorageService();

  async function fetchObjectAsBuffer(objectPath: string): Promise<Buffer | null> {
    try {
      if (!objectPath || (!objectPath.startsWith('/objects/') && !objectPath.startsWith('http'))) {
        return null;
      }
      let filePath = objectPath;
      if (objectPath.startsWith('http')) {
        filePath = objectStorageService.normalizeObjectEntityPath(objectPath);
      }
      if (!filePath.startsWith('/objects/')) return null;
      const file = await objectStorageService.getObjectEntityFile(filePath);
      const [buffer] = await file.download();
      return buffer;
    } catch (err) {
      console.error('Failed to fetch object for report:', objectPath, err);
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

  return httpServer;
}
