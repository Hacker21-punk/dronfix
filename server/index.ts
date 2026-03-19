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

/*
Start server
*/
(async () => {
  await registerRoutes(app);
  await seedAdmin();

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
