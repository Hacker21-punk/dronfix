import { db } from "./db";
import {
  users,
  inventory,
  serviceRequests,
  partsRequested,
  partsConsumed,
  documents,
  images,
  expenses,
  invoices,
  logistics,
  type InsertInventory,
  type InsertServiceRequest,
  type InsertExpense,
  type UpdateServiceRequest,
} from "@shared/schema";
import { eq, sql, and, lte, desc, inArray } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<any>;
  getUserById(id: string): Promise<any>;
  createUser(data: { name: string; email: string; password: string; role: string }): Promise<any>;
  getAllUsers(): Promise<any[]>;
  updateUser(id: string, data: Partial<{ name: string; email: string; role: string }>): Promise<any>;
  deleteUser(id: string): Promise<void>;

  // Inventory
  getAllInventory(): Promise<any[]>;
  createInventoryItem(data: InsertInventory): Promise<any>;
  updateInventoryItem(id: number, data: Partial<InsertInventory>): Promise<any>;
  deleteInventoryItem(id: number): Promise<void>;

  // Service Requests
  getAllServiceRequests(role?: string, userId?: string): Promise<any[]>;
  getServiceRequestWithDetails(id: number): Promise<any>;
  createServiceRequest(data: InsertServiceRequest): Promise<any>;
  updateServiceRequest(id: number, data: UpdateServiceRequest): Promise<any>;
  assignEngineer(id: number, engineerId: string): Promise<any>;
  deleteServiceRequest(id: number): Promise<void>;

  // Parts Requested
  addPartsRequested(serviceRequestId: number, items: { itemName: string; quantity: number }[]): Promise<any[]>;

  // Parts Consumed
  consumePart(serviceRequestId: number, inventoryId: number, quantity: number): Promise<any>;

  // Documents
  addDocument(serviceRequestId: number, type: string, fileUrl: string, uploadedBy: string): Promise<any>;
  getDocuments(serviceRequestId: number): Promise<any[]>;

  // Images
  addImage(serviceRequestId: number, type: string, fileUrl: string): Promise<any>;

  // Expenses
  getExpenses(serviceRequestId: number): Promise<any[]>;
  addExpense(serviceRequestId: number, data: any): Promise<any>;
  updateExpense(expenseId: number, data: any): Promise<any>;
  deleteExpense(expenseId: number): Promise<void>;

  // Invoices
  createInvoice(serviceRequestId: number, data: any): Promise<any>;
  getInvoice(serviceRequestId: number): Promise<any>;

  // Logistics
  upsertLogistics(serviceRequestId: number, data: any): Promise<any>;
  getLogistics(serviceRequestId: number): Promise<any>;

  // Dashboard
  getDashboardStats(role?: string, userId?: string): Promise<any>;
  
  // Billing
  getBilledRequests(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // ── Users ──────────────────────────────────────────────────────────────────
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async createUser(data: { name: string; email: string; password: string; role: string }) {
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role as any,
    }).returning();
    return user;
  }

  async getAllUsers() {
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.name);
  }

  async updateUser(id: string, data: Partial<{ name: string; email: string; role: string }>) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;

    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  async getAllInventory() {
    return db.select().from(inventory).orderBy(inventory.itemName);
  }

  async createInventoryItem(data: InsertInventory) {
    const [item] = await db.insert(inventory).values(data).returning();
    return item;
  }

  async updateInventoryItem(id: number, data: Partial<InsertInventory>) {
    const [item] = await db.update(inventory).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(inventory.id, id)).returning();
    return item;
  }

  async deleteInventoryItem(id: number) {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  // ── Service Requests ───────────────────────────────────────────────────────
  async getAllServiceRequests(role?: string, userId?: string) {
    let rows: any[];

    if (role === "engineer" && userId) {
      rows = await db.select().from(serviceRequests)
        .where(eq(serviceRequests.assignedEngineerId, userId))
        .orderBy(desc(serviceRequests.createdAt));
    } else {
      rows = await db.select().from(serviceRequests)
        .orderBy(desc(serviceRequests.createdAt));
    }

    // Join engineer names
    if (rows.length === 0) return rows;

    const engineerIds = Array.from(new Set(rows.map(r => r.assignedEngineerId).filter(Boolean)));
    let engineerMap: Record<string, string> = {};

    if (engineerIds.length > 0) {
      const engineers = await db.select({ id: users.id, name: users.name })
        .from(users).where(inArray(users.id, engineerIds));
      engineerMap = Object.fromEntries(engineers.map(e => [e.id, e.name]));
    }

    // Get logistics for each request (for shipping status)
    const requestIds = rows.map(r => r.id);
    const logisticsRows = await db.select().from(logistics)
      .where(inArray(logistics.serviceRequestId, requestIds));
    const logisticsMap: Record<number, any> = {};
    for (const l of logisticsRows) {
      logisticsMap[l.serviceRequestId] = l;
    }

    return rows.map(r => ({
      ...r,
      assignedTo: r.assignedEngineerId ? { name: engineerMap[r.assignedEngineerId] || "Unknown" } : null,
      logistics: logisticsMap[r.id] || null,
    }));
  }

  async getServiceRequestWithDetails(id: number) {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    if (!request) return null;

    const [requestImages, requestDocuments, requestPartsConsumed, requestPartsRequested, requestExpenses, requestInvoices, requestLogistics] = await Promise.all([
      db.select().from(images).where(eq(images.serviceRequestId, id)),
      db.select().from(documents).where(eq(documents.serviceRequestId, id)),
      db.select().from(partsConsumed).where(eq(partsConsumed.serviceRequestId, id)),
      db.select().from(partsRequested).where(eq(partsRequested.serviceRequestId, id)),
      db.select().from(expenses).where(eq(expenses.serviceRequestId, id)),
      db.select().from(invoices).where(eq(invoices.serviceRequestId, id)),
      db.select().from(logistics).where(eq(logistics.serviceRequestId, id)),
    ]);

    // Resolve inventory item names for consumed parts
    let partsWithNames = requestPartsConsumed;
    if (requestPartsConsumed.length > 0) {
      const inventoryIds = Array.from(new Set(requestPartsConsumed.map(p => p.inventoryId)));
      const inventoryItems = await db.select({ id: inventory.id, itemName: inventory.itemName })
        .from(inventory).where(inArray(inventory.id, inventoryIds));
      const itemMap = Object.fromEntries(inventoryItems.map(i => [i.id, i.itemName]));

      partsWithNames = requestPartsConsumed.map(p => ({
        ...p,
        itemName: itemMap[p.inventoryId] || "Unknown Item",
      }));
    }

    // Get assigned engineer name
    let assignedEngineer = null;
    if (request.assignedEngineerId) {
      const [eng] = await db.select({ id: users.id, name: users.name })
        .from(users).where(eq(users.id, request.assignedEngineerId));
      assignedEngineer = eng || null;
    }

    return {
      ...request,
      assignedTo: assignedEngineer,
      images: requestImages,
      documents: requestDocuments,
      partsConsumed: partsWithNames,
      partsRequested: requestPartsRequested,
      expenses: requestExpenses,
      invoice: requestInvoices[0] || null,
      logistics: requestLogistics[0] || null,
    };
  }

  async createServiceRequest(data: InsertServiceRequest) {
    const [request] = await db.insert(serviceRequests).values(data).returning();
    return request;
  }

  async updateServiceRequest(id: number, data: UpdateServiceRequest) {
    const updateData: any = { ...data };
    if (data.status === "completed" && !(data as any).closedAt) {
      updateData.closedAt = new Date();
    }
    if (data.tentativeServiceDate && typeof data.tentativeServiceDate === "string") {
      updateData.tentativeServiceDate = new Date(data.tentativeServiceDate);
    }

    const [request] = await db.update(serviceRequests).set(updateData).where(eq(serviceRequests.id, id)).returning();
    return request;
  }

  async assignEngineer(id: number, engineerId: string) {
    const [request] = await db.update(serviceRequests)
      .set({ assignedEngineerId: engineerId })
      .where(eq(serviceRequests.id, id)).returning();
    return request;
  }

  async deleteServiceRequest(id: number) {
    // Cascade delete all related child records first
    await db.delete(images).where(eq(images.serviceRequestId, id));
    await db.delete(documents).where(eq(documents.serviceRequestId, id));
    await db.delete(partsConsumed).where(eq(partsConsumed.serviceRequestId, id));
    await db.delete(partsRequested).where(eq(partsRequested.serviceRequestId, id));
    await db.delete(expenses).where(eq(expenses.serviceRequestId, id));
    await db.delete(invoices).where(eq(invoices.serviceRequestId, id));
    await db.delete(logistics).where(eq(logistics.serviceRequestId, id));
    // Then delete the service request itself
    await db.delete(serviceRequests).where(eq(serviceRequests.id, id));
  }

  // ── Parts Requested ────────────────────────────────────────────────────────
  async addPartsRequested(serviceRequestId: number, items: { itemName: string; quantity: number }[]) {
    const values = items.map(item => ({ serviceRequestId, ...item }));
    return db.insert(partsRequested).values(values).returning();
  }

  // ── Parts Consumed (with inventory transaction) ────────────────────────────
  async consumePart(serviceRequestId: number, inventoryId: number, quantity: number) {
    // Check stock
    const [item] = await db.select().from(inventory).where(eq(inventory.id, inventoryId));
    if (!item) throw new Error("Inventory item not found");
    if (item.quantity < quantity) throw new Error("Insufficient stock");

    // Deduct stock
    await db.update(inventory).set({
      quantity: item.quantity - quantity,
      updatedAt: new Date(),
    }).where(eq(inventory.id, inventoryId));

    // Record consumption
    const [consumed] = await db.insert(partsConsumed).values({
      serviceRequestId,
      inventoryId,
      quantityUsed: quantity,
    }).returning();

    return consumed;
  }

  // ── Documents ──────────────────────────────────────────────────────────────
  async addDocument(serviceRequestId: number, type: string, fileUrl: string, uploadedBy: string) {
    const [doc] = await db.insert(documents).values({
      serviceRequestId,
      type: type as any,
      fileUrl,
      uploadedBy,
    }).returning();
    return doc;
  }

  async getDocuments(serviceRequestId: number) {
    return db.select().from(documents).where(eq(documents.serviceRequestId, serviceRequestId));
  }

  // ── Images ─────────────────────────────────────────────────────────────────
  async addImage(serviceRequestId: number, type: string, fileUrl: string) {
    const [image] = await db.insert(images).values({
      serviceRequestId,
      type,
      fileUrl,
    }).returning();
    return image;
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  async getExpenses(serviceRequestId: number) {
    return db.select().from(expenses).where(eq(expenses.serviceRequestId, serviceRequestId)).orderBy(desc(expenses.date));
  }

  async addExpense(serviceRequestId: number, data: any) {
    const [expense] = await db.insert(expenses).values({
      serviceRequestId,
      date: new Date(data.date),
      description: data.description,
      amount: data.amount,
      billStatus: data.billStatus,
      billFile: data.billFile || null,
      onlineSlip: data.onlineSlip,
      slipFile: data.slipFile || null,
      paymentMode: data.onlineSlip ? "Online" : "Cash",
      travelMode: data.travelMode as any,
      baseLocation: data.baseLocation,
      remarks: data.remarks || null,
    }).returning();
    return expense;
  }

  async updateExpense(expenseId: number, data: any) {
    const [expense] = await db.update(expenses).set({
      date: new Date(data.date),
      description: data.description,
      amount: data.amount,
      billStatus: data.billStatus,
      billFile: data.billFile || null,
      onlineSlip: data.onlineSlip,
      slipFile: data.slipFile || null,
      paymentMode: data.onlineSlip ? "Online" : "Cash",
      travelMode: data.travelMode as any,
      baseLocation: data.baseLocation,
      remarks: data.remarks || null,
    }).where(eq(expenses.id, expenseId)).returning();
    return expense;
  }

  async deleteExpense(expenseId: number) {
    await db.delete(expenses).where(eq(expenses.id, expenseId));
  }

  // ── Invoices ───────────────────────────────────────────────────────────────
  async createInvoice(serviceRequestId: number, data: any) {
    // Upsert: delete existing then insert
    await db.delete(invoices).where(eq(invoices.serviceRequestId, serviceRequestId));

    const [invoice] = await db.insert(invoices).values({
      serviceRequestId,
      invoiceNumber: data.invoiceNumber,
      challanNumber: data.challanNumber || null,
      invoiceValue: data.invoiceValue,
      reimbursementAmount: data.reimbursementAmount || null,
      invoiceType: data.invoiceType || null,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
    }).returning();

    // Mark service request as closed/billed
    await db.update(serviceRequests).set({ status: "billed", closedAt: new Date() })
      .where(eq(serviceRequests.id, serviceRequestId));

    return invoice;
  }

  async getInvoice(serviceRequestId: number) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.serviceRequestId, serviceRequestId));
    return invoice || null;
  }

  // ── Logistics ──────────────────────────────────────────────────────────────
  async upsertLogistics(serviceRequestId: number, data: any) {
    const existing = await db.select().from(logistics).where(eq(logistics.serviceRequestId, serviceRequestId));

    if (existing.length > 0) {
      const [updated] = await db.update(logistics).set({
        shippingPartner: data.shippingPartner,
        docketNumber: data.docketNumber || null,
        shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
        shippingStatus: data.shippingStatus as any || "shipped",
      }).where(eq(logistics.serviceRequestId, serviceRequestId)).returning();
      return updated;
    } else {
      const [created] = await db.insert(logistics).values({
        serviceRequestId,
        shippingPartner: data.shippingPartner,
        docketNumber: data.docketNumber || null,
        shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
        shippingStatus: data.shippingStatus as any || "shipped",
      }).returning();
      return created;
    }
  }

  async getLogistics(serviceRequestId: number) {
    const [row] = await db.select().from(logistics).where(eq(logistics.serviceRequestId, serviceRequestId));
    return row || null;
  }

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  async getDashboardStats(role?: string, userId?: string) {
    const allInventory = await db.select().from(inventory);
    const totalStockValue = allInventory.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const lowStockItems = allInventory.filter(item => item.quantity <= item.criticalLevel);

    let requestsQuery = db.select().from(serviceRequests);
    let allRequests: any[];

    if (role === "engineer" && userId) {
      allRequests = await requestsQuery.where(eq(serviceRequests.assignedEngineerId, userId));
    } else {
      allRequests = await requestsQuery;
    }

    const openRequests = allRequests.filter(r => ["pending", "accepted", "in_progress"].includes(r.status));
    const closedRequests = allRequests.filter(r => ["completed", "billed"].includes(r.status));

    const avgAging = (type: string) => {
      const filtered = openRequests.filter(r => r.serviceType === type && r.createdAt);
      if (filtered.length === 0) return 0;
      const now = Date.now();
      const totalDays = filtered.reduce((sum, r) => {
        return sum + Math.floor((now - new Date(r.createdAt!).getTime()) / 86400000);
      }, 0);
      return Math.round(totalDays / filtered.length);
    };

    return {
      totalStockValue,
      lowStockItems,
      pendingRequests: openRequests.length,
      completedRequests: closedRequests.length,
      avgAgingL1: avgAging("L1"),
      avgAgingL2: avgAging("L2"),
      avgAgingL3: avgAging("L3"),
    };
  }

  // ── Billing ────────────────────────────────────────────────────────────────
  async getBilledRequests() {
    const closedRequests = await db.select().from(serviceRequests)
      .where(eq(serviceRequests.status, "billed"))
      .orderBy(desc(serviceRequests.closedAt));

    if (closedRequests.length === 0) return [];

    const requestIds = closedRequests.map(r => r.id);
    const invoiceRows = await db.select().from(invoices)
      .where(inArray(invoices.serviceRequestId, requestIds));
    const invoiceMap = Object.fromEntries(invoiceRows.map(i => [i.serviceRequestId, i]));

    return closedRequests
      .filter(r => invoiceMap[r.id])
      .map(r => ({
        ...r,
        invoice: invoiceMap[r.id],
      }));
  }
}

export const storage = new DatabaseStorage();
