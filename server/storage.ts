import { db } from "./db";
import { eq, sql, desc, and, lte } from "drizzle-orm";
import {
  users, profiles, inventory, serviceRequests, serviceImages, partsConsumed,
  type User, type InsertUser, type Profile, type InsertInventory, type Inventory,
  type InsertServiceRequest, type ServiceRequest, type InsertPartsConsumedSchema,
  type ServiceImage, type PartConsumed, type UpdateServiceRequest
} from "@shared/schema";

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: any): Promise<Profile>;
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
  
  // Dashboard
  getDashboardStats(): Promise<any>;
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
    const [profile] = await db.insert(profiles).values(profileData).returning();
    return profile;
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
    // Fetch parts with inventory details
    const parts = await db.select({
      id: partsConsumed.id,
      serviceRequestId: partsConsumed.serviceRequestId,
      inventoryId: partsConsumed.inventoryId,
      quantity: partsConsumed.quantity,
      recordedAt: partsConsumed.recordedAt,
      // We can also select inventory name here if we join, but for now strict typing
    }).from(partsConsumed).where(eq(partsConsumed.serviceRequestId, id));
    
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
  
  // Dashboard
  async getDashboardStats(): Promise<any> {
    // Total Stock Value
    const allInventory = await this.getAllInventory();
    const totalStockValue = allInventory.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    
    // Low Stock Items
    const lowStockItems = allInventory.filter(item => item.quantity <= item.criticalLevel);
    
    // Requests stats
    const allRequests = await db.select().from(serviceRequests);
    const pendingRequests = allRequests.filter(r => r.status === "pending" || r.status === "accepted" || r.status === "in_progress").length;
    const completedRequests = allRequests.filter(r => r.status === "completed" || r.status === "billed").length;
    
    return {
      totalStockValue,
      lowStockItems,
      pendingRequests,
      completedRequests
    };
  }
}

export const storage = new DatabaseStorage();
