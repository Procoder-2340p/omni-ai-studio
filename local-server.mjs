// Zero-Dependency Local Server for PC Testing
// Run with: node local-server.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import chatHandler from "./api/chat.js";
import imageHandler from "./api/image.js";
import healthHandler from "./api/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Load .env file automatically if present
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
  console.log("Loaded environment variables from .env");
}

function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };
  return res;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 15 * 1024 * 1024) {
        reject(new Error("Payload too large (max 15MB)"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer(async (req, res) => {
  wrapRes(res);
  const urlPath = (req.url || "/").split("?")[0];

  try {
    if (urlPath === "/api/health") return healthHandler(req, res);
    if (urlPath === "/api/chat") {
      req.body = await readJsonBody(req);
      return await chatHandler(req, res);
    }
    if (urlPath === "/api/image") {
      req.body = await readJsonBody(req);
      return await imageHandler(req, res);
    }

    const safeFile = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const filePath = path.join(__dirname, "public", safeFile);
    const resolved = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : path.join(__dirname, "public", "index.html");

    const ext = path.extname(resolved);
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    fs.createReadStream(resolved).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 OmniAI Studio running locally at: http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop.\n`);
});
