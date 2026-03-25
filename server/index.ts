import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { seedAdmin } from "./seed";
import path from "path";
const app = express();
const httpServer = createServer(app);

/*
Resolve __dirname for ES modules
*/
const __dirname = path.resolve();

/*
Extend Express request to include rawBody
*/
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/*
JSON parser with raw body capture
*/
app.use(
  express.json({
    verify: (req: Request, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

/*
Logger helper
*/
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/*
API request logger
*/
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const pathName = req.path;

  let capturedJson: unknown;

  const originalJson = res.json.bind(res);

  (res as any).json = (body: any) => {
    capturedJson = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;


    if (pathName.startsWith("/api")) {
      let logLine = `${req.method} ${pathName} ${res.statusCode} in ${duration}ms`;

      if (capturedJson) {
        logLine += ` :: ${JSON.stringify(capturedJson)}`;
      }

      log(logLine);
    }

  });

  next();
});

import { pool } from "./db";
import { seedMaterials } from "./seed-materials-startup";

/*
  Runtime schema migration — ensures new columns/tables exist even if db:push failed
*/
async function runMigrations() {
  const client = await pool.connect();
  try {
    // ── New tables (Inventory system) ─────────────────────────────────────
    const createTableStatements = [
      `CREATE TABLE IF NOT EXISTS materials_master (
        id SERIAL PRIMARY KEY,
        material_code TEXT NOT NULL UNIQUE,
        hsn_code TEXT,
        material_description TEXT NOT NULL,
        gst_rate DECIMAL(5,2) DEFAULT 18,
        customer_basic_price DECIMAL(12,2) NOT NULL,
        gst_amount DECIMAL(12,2) NOT NULL,
        customer_sale_price DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS service_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS job_card_items (
        id SERIAL PRIMARY KEY,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id),
        material_id INTEGER REFERENCES materials_master(id),
        material_description_snapshot TEXT NOT NULL,
        material_code_snapshot TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price_snapshot DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT NOW()
      )`,
    ];

    for (const sql of createTableStatements) {
      try { await client.query(sql); } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.warn(`Migration (create table) warning: ${e.message}`);
        }
      }
    }

    // ── New columns on job_cards ──────────────────────────────────────────
    const jobCardAlters = [
      `ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS crm_ticket_number TEXT`,
      `ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS model_details TEXT`,
      `ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS job_service_type TEXT`,
      `ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS engineer_notes TEXT`,
    ];

    // Add unique constraint on crm_ticket_number (safe if already exists)
    const jobCardConstraints = [
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_cards_crm_ticket_number_unique')
        THEN ALTER TABLE job_cards ADD CONSTRAINT job_cards_crm_ticket_number_unique UNIQUE (crm_ticket_number);
        END IF;
      END $$`,
    ];

    // ── Existing expense column migrations ───────────────────────────────
    const alterStatements = [
      ...jobCardAlters,
      ...jobCardConstraints,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_category TEXT`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_subcategory TEXT`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS meter_start_reading DECIMAL(10,1)`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS meter_stop_reading DECIMAL(10,1)`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS meter_start_image TEXT`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS meter_stop_image TEXT`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_status BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_file TEXT`,
      // Make travel_mode nullable (was previously NOT NULL with enum)
      `ALTER TABLE expenses ALTER COLUMN travel_mode DROP NOT NULL`,
    ];

    // Also ensure the service_status enum has all needed values
    const enumStatements = [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'open' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_status')) THEN ALTER TYPE service_status ADD VALUE 'open'; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'assigned' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_status')) THEN ALTER TYPE service_status ADD VALUE 'assigned'; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_status')) THEN ALTER TYPE service_status ADD VALUE 'pending'; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accepted' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_status')) THEN ALTER TYPE service_status ADD VALUE 'accepted'; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_status')) THEN ALTER TYPE service_status ADD VALUE 'in_progress'; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_status')) THEN ALTER TYPE service_status ADD VALUE 'completed'; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'billed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_status')) THEN ALTER TYPE service_status ADD VALUE 'billed'; END IF; END $$`,
    ];

    for (const sql of [...alterStatements, ...enumStatements]) {
      try { await client.query(sql); } catch (e: any) {
        // Ignore errors for already-existing columns or enum values
        if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
          console.warn(`Migration warning: ${e.message}`);
        }
      }
    }

    // Change travel_mode column type from enum to text if it's still an enum
    try {
      await client.query(`ALTER TABLE expenses ALTER COLUMN travel_mode TYPE TEXT`);
    } catch (e: any) {
      // Ignore if already text
    }

    log("Schema migrations applied successfully", "migration");
  } finally {
    client.release();
  }
}

/*
Start server
*/
(async () => {
  // Run raw SQL migrations to ensure schema is up to date
  await runMigrations();

  await registerRoutes(app);
  await seedAdmin();
  await seedMaterials();

  /*
  Global error handler
  */
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    res.status(status).json({ message });


  });

  /*
  Serve frontend in production
  */
  if (process.env.NODE_ENV === "production") {
    const clientPath = path.resolve(process.cwd(), "dist/public");

    app.use(express.static(clientPath));

    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(clientPath, "index.html"));
    });

  } else {
    /*
    Vite dev server
    */
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  /*
  Start listening
  */
  const PORT = Number(process.env.PORT) || 5000;

  httpServer.listen(PORT, () => {
    log(`Server running on port ${PORT}`);
  });
})();
