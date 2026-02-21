import { db } from "./db";
import { eq, sql, desc, and, lte } from "drizzle-orm";
import {
  users, profiles, inventory, serviceRequests, serviceImages, partsConsumed, engineerExpenses,
  type User, type UpsertUser, type Profile, type InsertInventory, type Inventory,
  type InsertServiceRequest, type ServiceRequest, type insertPartsConsumedSchema,
  type ServiceImage, type PartConsumed, type UpdateServiceRequest,
  type EngineerExpense, type InsertEngineerExpense
} from "@shared/schema";

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: any): Promise<Profile>;
  updateProfile(id: number, data: { name?: string; email?: string; role?: 'admin' | 'engineer' | 'account' | 'logistics' }): Promise<Profile | undefined>;
  getAllProfiles(): Promise<Profile[]>;
  
  // Inventory
  getAllInventory(): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, updates: Partial<InsertInventory>): Promise<Inventory>;
  deleteInventoryItem(id: number): Promise<void>;
  
  // Service Requests
  getAllServiceRequests(): Promise<(ServiceRequest & { assignedTo?: { name: string } })[]>;
  getServiceRequest(id: number): Promise<ServiceRequest | undefined>;
  getServiceRequestWithDetails(id: number): Promise<ServiceRequest & { images: ServiceImage[], parts: PartConsumed[], assignedTo?: Profile } | undefined>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: number, updates: UpdateServiceRequest): Promise<ServiceRequest>;
  
  // Service Images
  addServiceImage(image: any): Promise<ServiceImage>;
  getServiceImages(requestId: number): Promise<ServiceImage[]>;
  
  // Parts Consumed
  addPartConsumed(part: any): Promise<PartConsumed>;
  getPartsConsumed(requestId: number): Promise<PartConsumed[]>;
  
  // Engineer Expenses
  getExpenses(serviceRequestId: number): Promise<EngineerExpense[]>;
  addExpense(expense: InsertEngineerExpense): Promise<EngineerExpense>;
  deleteExpense(id: number): Promise<void>;
  
  // Dashboard
  getDashboardStats(engineerId?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Profiles
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }
  
  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, email));
    return profile;
  }

  async createProfile(profileData: any): Promise<Profile> {
    if (profileData.id) {
      const [updated] = await db.update(profiles)
        .set(profileData)
        .where(eq(profiles.id, profileData.id))
        .returning();
      return updated;
    }
    const [profile] = await db.insert(profiles).values(profileData).returning();
    return profile;
  }
  
  async updateProfile(id: number, data: { name?: string; email?: string; role?: 'admin' | 'engineer' | 'account' | 'logistics' }): Promise<Profile | undefined> {
    const [updated] = await db.update(profiles)
      .set(data)
      .where(eq(profiles.id, id))
      .returning();
    return updated;
  }

  async getAllProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles);
  }

  // Inventory
  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory).orderBy(desc(inventory.updatedAt));
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db.insert(inventory).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventory>): Promise<Inventory> {
    const [updated] = await db.update(inventory).set({ ...updates, updatedAt: new Date() }).where(eq(inventory.id, id)).returning();
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  // Service Requests
  async getAllServiceRequests(): Promise<(ServiceRequest & { assignedTo?: { name: string } })[]> {
    const requests = await db.query.serviceRequests.findMany({
      orderBy: desc(serviceRequests.createdAt),
      with: {
        assignedTo: true // This relates to users table, but we want profile name. 
        // We'll join or just fetch profile.
        // Actually, assignedTo relates to `users` table. `profiles` also relates to `users`.
        // Let's do a join with profiles.
      }
    });
    
    // Map to include profile name
    const requestWithProfileNames = await Promise.all(requests.map(async (req) => {
      let assignedName = "Unassigned";
      if (req.assignedToId) {
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.assignedToId));
        if (profile) assignedName = profile.name;
      }
      return { ...req, assignedTo: { name: assignedName } };
    }));
    
    return requestWithProfileNames;
  }

  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    const [req] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return req;
  }

  async getServiceRequestWithDetails(id: number): Promise<ServiceRequest & { images: ServiceImage[], parts: PartConsumed[], assignedTo?: Profile } | undefined> {
    const request = await this.getServiceRequest(id);
    if (!request) return undefined;
    
    const images = await this.getServiceImages(id);
    const partsRaw = await db.select({
      id: partsConsumed.id,
      serviceRequestId: partsConsumed.serviceRequestId,
      inventoryId: partsConsumed.inventoryId,
      quantity: partsConsumed.quantity,
      recordedAt: partsConsumed.recordedAt,
      itemName: inventory.name,
      itemPrice: inventory.price,
      itemSku: inventory.sku,
    }).from(partsConsumed)
      .leftJoin(inventory, eq(partsConsumed.inventoryId, inventory.id))
      .where(eq(partsConsumed.serviceRequestId, id));
    
    const parts = partsRaw.map(p => ({
      id: p.id,
      serviceRequestId: p.serviceRequestId,
      inventoryId: p.inventoryId,
      quantity: p.quantity,
      recordedAt: p.recordedAt,
      item: { name: p.itemName, price: p.itemPrice, sku: p.itemSku },
    }));
    
    let assignedProfile: Profile | undefined;
    if (request.assignedToId) {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, request.assignedToId));
      assignedProfile = profile;
    }
    
    return { ...request, images, parts, assignedTo: assignedProfile };
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const [newReq] = await db.insert(serviceRequests).values(request).returning();
    return newReq;
  }

  async updateServiceRequest(id: number, updates: UpdateServiceRequest): Promise<ServiceRequest> {
    // Handle tentativeServiceDate string to Date conversion if needed
    const { tentativeServiceDate, ...rest } = updates;
    const updateData: any = { ...rest };
    
    if (tentativeServiceDate) {
      updateData.tentativeServiceDate = new Date(tentativeServiceDate);
    }
    
    if (updates.status === "completed") {
      updateData.completedAt = new Date();
    }
    
    const [updated] = await db.update(serviceRequests).set(updateData).where(eq(serviceRequests.id, id)).returning();
    return updated;
  }

  // Service Images
  async addServiceImage(image: any): Promise<ServiceImage> {
    const [newImage] = await db.insert(serviceImages).values(image).returning();
    return newImage;
  }

  async getServiceImages(requestId: number): Promise<ServiceImage[]> {
    return await db.select().from(serviceImages).where(eq(serviceImages.serviceRequestId, requestId));
  }

  // Parts Consumed
  async addPartConsumed(part: any): Promise<PartConsumed> {
    // Wrap in transaction to deduct stock
    return await db.transaction(async (tx) => {
      // Check stock
      const [item] = await tx.select().from(inventory).where(eq(inventory.id, part.inventoryId));
      if (!item || item.quantity < part.quantity) {
        throw new Error("Insufficient stock");
      }
      
      // Deduct stock
      await tx.update(inventory)
        .set({ quantity: item.quantity - part.quantity, updatedAt: new Date() })
        .where(eq(inventory.id, part.inventoryId));
        
      // Record consumption
      const [newPart] = await tx.insert(partsConsumed).values(part).returning();
      return newPart;
    });
  }

  async getPartsConsumed(requestId: number): Promise<PartConsumed[]> {
    return await db.select().from(partsConsumed).where(eq(partsConsumed.serviceRequestId, requestId));
  }
  
  // Engineer Expenses
  async getExpenses(serviceRequestId: number): Promise<EngineerExpense[]> {
    return await db.select().from(engineerExpenses)
      .where(eq(engineerExpenses.serviceRequestId, serviceRequestId))
      .orderBy(desc(engineerExpenses.date));
  }

  async addExpense(expense: InsertEngineerExpense): Promise<EngineerExpense> {
    const [newExpense] = await db.insert(engineerExpenses).values(expense).returning();
    return newExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(engineerExpenses).where(eq(engineerExpenses.id, id));
  }

  // Dashboard
  async getDashboardStats(engineerId?: string): Promise<any> {
    const allInventory = await this.getAllInventory();
    const totalStockValue = allInventory.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    const lowStockItems = allInventory.filter(item => item.quantity <= item.criticalLevel);
    
    const allRequests = await db.select().from(serviceRequests);
    const relevantRequests = engineerId
      ? allRequests.filter(r => r.assignedToId === engineerId)
      : allRequests;

    const pendingRequests = relevantRequests.filter(r => r.status === "pending" || r.status === "accepted" || r.status === "in_progress").length;
    const completedRequests = relevantRequests.filter(r => r.status === "completed" || r.status === "billed").length;
    
    const now = new Date();
    const openRequests = relevantRequests.filter(r => r.status === "pending" || r.status === "accepted" || r.status === "in_progress");

    const avgAging = (type: string) => {
      const filtered = openRequests.filter(r => r.serviceType === type);
      if (filtered.length === 0) return 0;
      const totalDays = filtered.reduce((sum, r) => {
        const created = r.createdAt ? new Date(r.createdAt) : now;
        return sum + Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);
      return Math.round((totalDays / filtered.length) * 10) / 10;
    };

    return {
      totalStockValue,
      lowStockItems,
      pendingRequests,
      completedRequests,
      avgAgingL1: avgAging("L1"),
      avgAgingL2: avgAging("L2"),
      avgAgingL3: avgAging("L3"),
    };
  }
}

export const storage = new DatabaseStorage();
