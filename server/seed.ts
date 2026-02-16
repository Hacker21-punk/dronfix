import { storage } from "./storage";
import { db } from "./db";
import { inventory, serviceRequests } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");
  
  // Seed Inventory
  const existingInventory = await storage.getAllInventory();
  if (existingInventory.length === 0) {
    console.log("Seeding inventory...");
    await storage.createInventoryItem({
      name: "Propeller Set (4x)",
      sku: "PROP-001",
      quantity: 50,
      criticalLevel: 10,
      price: "1200.00",
      description: "Standard propeller set for Quadcopter"
    });
    
    await storage.createInventoryItem({
      name: "LiPo Battery 5000mAh",
      sku: "BATT-5000",
      quantity: 20,
      criticalLevel: 5,
      price: "4500.00",
      description: "High capacity battery"
    });
    
    await storage.createInventoryItem({
      name: "Motor 2205",
      sku: "MTR-2205",
      quantity: 30,
      criticalLevel: 8,
      price: "1500.00",
      description: "Brushless motor"
    });
    
    await storage.createInventoryItem({
      name: "Flight Controller F4",
      sku: "FC-F4",
      quantity: 10,
      criticalLevel: 3,
      price: "3500.00",
      description: "F4 Flight Controller board"
    });
    
    await storage.createInventoryItem({
      name: "GPS Module",
      sku: "GPS-M8N",
      quantity: 15,
      criticalLevel: 5,
      price: "2000.00",
      description: "High precision GPS"
    });
  }
  
  console.log("Seeding complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
