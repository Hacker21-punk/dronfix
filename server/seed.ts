import { db } from "./db";
import { users } from "../shared/models/auth";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

export async function seedAdmin() {
  try {
    const existing = await db.select().from(users).where(eq(users.email, "admin@dronefix.com"));
    if (existing.length > 0 && existing[0].password) {
      console.log("[seed] Admin user already exists, skipping.");
      return;
    }

    const hashedPw = await hashPassword("Admin@123");

    if (existing.length > 0) {
      await db.update(users).set({ password: hashedPw, name: "Admin DroneFix", role: "admin" })
        .where(eq(users.email, "admin@dronefix.com"));
      console.log("[seed] Updated existing admin user.");
    } else {
      await db.insert(users).values({
        name: "Admin DroneFix",
        email: "admin@dronefix.com",
        password: hashedPw,
        role: "admin",
      });
      console.log("[seed] Created admin user: admin@dronefix.com / Admin@123");
    }
  } catch (err: any) {
    if (err.code === "23505") {
      console.log("[seed] Admin already exists.");
    } else {
      console.error("[seed] Error:", err.message);
    }
  }
}
