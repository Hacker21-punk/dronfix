import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// Enums
export const roleEnum = pgEnum("role", ["admin", "engineer", "account", "logistics"]);
export const serviceTypeEnum = pgEnum("service_type", ["L1", "L2", "L3"]);
export const serviceStatusEnum = pgEnum("service_status", ["pending", "accepted", "in_progress", "completed", "billed"]);
export const shippingStatusEnum = pgEnum("shipping_status", ["shipped", "in_transit", "delivered"]);
export const modeOfTravelEnum = pgEnum("mode_of_travel", ["Train", "Bus", "Auto", "Flight"]);

// Extend users table with role - we'll do this by defining a separate profile table 
// or just assuming we can add to the auth schema. 
// Since we can't easily modify the imported auth.ts without file edits, 
// let's create a 'user_roles' table or just assume we'll edit auth.ts later.
// Actually, editing auth.ts is better. I will do that in a separate step. 
// For now, let's assume 'users' has 'role'. 
// Wait, I can't assume that if I don't add it.
// I will create a `profiles` table to extend user data.
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // Nullable until they log in and link account
  role: roleEnum("role").default("engineer").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  quantity: integer("quantity").notNull().default(0),
  criticalLevel: integer("critical_level").notNull().default(5),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  pilotName: text("pilot_name").notNull(),
  droneNo: text("drone_no").notNull(),
  droneSerial: text("drone_serial").notNull(),
  pilotAddress: text("pilot_address").notNull(),
  pincode: text("pincode"),
  state: text("state"),
  district: text("district"),
  contactDetails: text("contact_details").notNull(),
  complaint: text("complaint").notNull(),
  partsRequested: text("parts_requested"), // Initial request
  serviceType: serviceTypeEnum("service_type").notNull(),
  status: serviceStatusEnum("status").default("pending").notNull(),
  
  // Assigned to (Engineer)
  assignedToId: text("assigned_to_id").references(() => users.id),
  tentativeServiceDate: timestamp("tentative_service_date"),
  
  // Completion details
  completedAt: timestamp("completed_at"),
  
  // Documents (URLs)
  jobSheetUrl: text("job_sheet_url"),
  feedbackFormUrl: text("feedback_form_url"),
  crashReportUrl: text("crash_report_url"),
  auditReportUrl: text("audit_report_url"),
  logReportUrl: text("log_report_url"),
  
  // Billing / Invoice
  invoiceUrl: text("invoice_url"),
  challanUrl: text("challan_url"),
  billNo: text("bill_no"),
  invoiceNumber: text("invoice_number"),
  challanNumber: text("challan_number"),
  invoiceValue: decimal("invoice_value", { precision: 12, scale: 2 }),
  reimbursementAmount: decimal("reimbursement_amount", { precision: 12, scale: 2 }),
  invoiceType: text("invoice_type"),
  invoiceDate: timestamp("invoice_date"),

  // Logistics / Shipping
  shippingPartnerName: text("shipping_partner_name"),
  docketDetails: text("docket_details"),
  shippingDate: timestamp("shipping_date"),
  shippingStatus: shippingStatusEnum("shipping_status"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceImages = pgTable("service_images", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  imageUrl: text("image_url").notNull(),
  type: text("type").notNull(), // 'before' or 'after'
  createdAt: timestamp("created_at").defaultNow(),
});

export const partsConsumed = pgTable("parts_consumed", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id),
  quantity: integer("quantity").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const engineerExpenses = pgTable("engineer_expenses", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  engineerId: text("engineer_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  billStatus: boolean("bill_status").notNull().default(false),
  billImageUrl: text("bill_image_url"),
  onlineSlip: boolean("online_slip").notNull().default(false),
  onlineSlipImageUrl: text("online_slip_image_url"),
  modeOfPayment: text("mode_of_payment").notNull().default("Cash"),
  modeOfTravel: modeOfTravelEnum("mode_of_travel").notNull(),
  baseLocation: text("base_location").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [serviceRequests.assignedToId],
    references: [users.id],
  }),
  images: many(serviceImages),
  partsConsumed: many(partsConsumed),
  expenses: many(engineerExpenses),
}));

export const engineerExpensesRelations = relations(engineerExpenses, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [engineerExpenses.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

export const serviceImagesRelations = relations(serviceImages, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [serviceImages.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

export const partsConsumedRelations = relations(partsConsumed, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [partsConsumed.serviceRequestId],
    references: [serviceRequests.id],
  }),
  item: one(inventory, {
    fields: [partsConsumed.inventoryId],
    references: [inventory.id],
  }),
}));

// Schemas
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, updatedAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({ 
  id: true, 
  status: true, 
  completedAt: true, 
  createdAt: true 
});
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertPartsConsumedSchema = createInsertSchema(partsConsumed).omit({ id: true, recordedAt: true });
export const insertEngineerExpenseSchema = createInsertSchema(engineerExpenses).omit({ id: true, createdAt: true });

// Types
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type Profile = typeof profiles.$inferSelect;
export type ServiceImage = typeof serviceImages.$inferSelect;
export type PartConsumed = typeof partsConsumed.$inferSelect;
export type EngineerExpense = typeof engineerExpenses.$inferSelect;
export type InsertEngineerExpense = z.infer<typeof insertEngineerExpenseSchema>;

// Custom types for API
export type CreateServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type UpdateServiceRequest = Partial<CreateServiceRequest> & {
  status?: typeof serviceStatusEnum.enumValues[number];
  tentativeServiceDate?: any; // Allow string or Date for flexibility
};

