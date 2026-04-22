import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Initializing server...");
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf-8"));
  const ambientProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const targetProjectId = firebaseConfig.projectId;
  
  console.log("Ambient Project ID:", ambientProjectId);
  console.log("Target Project ID from config:", targetProjectId);

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: targetProjectId,
    });
  }

  const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" 
    ? firebaseConfig.firestoreDatabaseId 
    : undefined;

  const db = getFirestore(dbId);
  console.log(`Firebase Admin initialized. Database: ${dbId || "(default)"}`);

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Detect environment
  const distPath = path.join(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.join(distPath, "index.html"));

  // Vite middleware for development
  if (!isProd) {
    console.log("Initializing Vite server...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: "spa",
    });
    console.log("Vite server initialized.");
    app.use(vite.middlewares);
  } else {
    console.log("Running in Production mode. Serving static files from:", distPath);
    // Serve static assets first
    app.use(express.static(distPath, { index: false }));
    
    // Fallback all other routes to index.html for SPA routing
    app.get("*", (req, res) => {
      // Don't fallback API routes
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found" });
      }
      
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send("Build artifact (index.html) missing. Please run 'npm run build'.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
