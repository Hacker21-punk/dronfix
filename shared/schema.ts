import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, roleEnum } from "./models/auth";

export * from "./models/auth";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const serviceTypeEnum = pgEnum("service_type", ["L1", "L2", "L3"]);
export const serviceStatusEnum = pgEnum("service_status", ["pending", "open", "assigned", "accepted", "in_progress", "completed", "billed"]);
export const shippingStatusEnum = pgEnum("shipping_status", ["shipped", "in_transit", "delivered"]);
export const modeOfTravelEnum = pgEnum("mode_of_travel", ["Train", "Bus", "Auto", "Flight"]);
export const documentTypeEnum = pgEnum("document_type", ["job_sheet", "feedback", "crash_report", "audit_report", "log_report"]);

// ─── 1. INVENTORY ────────────────────────────────────────────────────────────
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  sku: text("sku").notNull().unique(),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  criticalLevel: integer("critical_level").notNull().default(5),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── 2. SERVICE REQUESTS ─────────────────────────────────────────────────────
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  pilotName: text("pilot_name").notNull(),
  droneNumber: text("drone_number").notNull(),
  serialNumber: text("serial_number").notNull(),
  address: text("address").notNull(),
  pincode: text("pincode"),
  state: text("state"),
  district: text("district"),
  contactDetails: text("contact_details").notNull(),
  complaint: text("complaint").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  status: serviceStatusEnum("status").default("pending").notNull(),
  assignedEngineerId: text("assigned_engineer_id").references(() => users.id),
  tentativeServiceDate: timestamp("tentative_service_date"),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

// ─── 3. PARTS REQUESTED ─────────────────────────────────────────────────────
export const partsRequested = pgTable("parts_requested", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

// ─── 4. PARTS CONSUMED ──────────────────────────────────────────────────────
export const partsConsumed = pgTable("parts_consumed", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id),
  quantityUsed: integer("quantity_used").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// ─── 5. DOCUMENTS ────────────────────────────────────────────────────────────
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  type: documentTypeEnum("type").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── 6. IMAGES ───────────────────────────────────────────────────────────────
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  type: text("type").notNull(), // 'before' or 'after'
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── 7. EXPENSES ─────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  billStatus: boolean("bill_status").notNull().default(false),
  billFile: text("bill_file"),
  onlineSlip: boolean("online_slip").notNull().default(false),
  slipFile: text("slip_file"),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  travelMode: text("travel_mode"),
  baseLocation: text("base_location").notNull(),
  remarks: text("remarks"),
  // New categorization fields
  expenseCategory: text("expense_category"),        // Travel | Food | Stay | Others
  expenseSubcategory: text("expense_subcategory"),    // Train, Bus, Auto, etc.
  // Meter reading fields (for Personal Bike/Car)
  meterStartReading: decimal("meter_start_reading", { precision: 10, scale: 1 }),
  meterStopReading: decimal("meter_stop_reading", { precision: 10, scale: 1 }),
  meterStartImage: text("meter_start_image"),
  meterStopImage: text("meter_stop_image"),
  // Approval fields
  approvalStatus: boolean("approval_status").notNull().default(false),
  approvalFile: text("approval_file"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── 8. INVOICES ─────────────────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  invoiceNumber: text("invoice_number").notNull(),
  challanNumber: text("challan_number"),
  invoiceValue: decimal("invoice_value", { precision: 12, scale: 2 }).notNull(),
  reimbursementAmount: decimal("reimbursement_amount", { precision: 12, scale: 2 }),
  invoiceType: text("invoice_type"),
  invoiceDate: timestamp("invoice_date"),
});

// ─── 9. LOGISTICS ────────────────────────────────────────────────────────────
export const logistics = pgTable("logistics", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  shippingPartner: text("shipping_partner").notNull(),
  docketNumber: text("docket_number"),
  shippingDate: timestamp("shipping_date"),
  shippingStatus: shippingStatusEnum("shipping_status").default("shipped"),
});

// ─── Relations ───────────────────────────────────────────────────────────────
export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  assignedEngineer: one(users, {
    fields: [serviceRequests.assignedEngineerId],
    references: [users.id],
  }),
  partsRequested: many(partsRequested),
  partsConsumed: many(partsConsumed),
  documents: many(documents),
  images: many(images),
  expenses: many(expenses),
  invoices: many(invoices),
  logistics: many(logistics),
}));

export const partsRequestedRelations = relations(partsRequested, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [partsRequested.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

export const partsConsumedRelations = relations(partsConsumed, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [partsConsumed.serviceRequestId],
    references: [serviceRequests.id],
  }),
  inventoryItem: one(inventory, {
    fields: [partsConsumed.inventoryId],
    references: [inventory.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [documents.serviceRequestId],
    references: [serviceRequests.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [images.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [expenses.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [invoices.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

export const logisticsRelations = relations(logistics, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [logistics.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

// ─── Insert Schemas ──────────────────────────────────────────────────────────
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, updatedAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  status: true,
  closedAt: true,
  createdAt: true,
});
export const insertPartsRequestedSchema = createInsertSchema(partsRequested).omit({ id: true });
export const insertPartsConsumedSchema = createInsertSchema(partsConsumed).omit({ id: true, timestamp: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertImageSchema = createInsertSchema(images).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertLogisticsSchema = createInsertSchema(logistics).omit({ id: true });

// ─── Types ───────────────────────────────────────────────────────────────────
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type PartRequested = typeof partsRequested.$inferSelect;
export type PartConsumed = typeof partsConsumed.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ServiceImage = typeof images.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type Logistics = typeof logistics.$inferSelect;

export type UpdateServiceRequest = Partial<InsertServiceRequest> & {
  status?: typeof serviceStatusEnum.enumValues[number];
  tentativeServiceDate?: any;
};
