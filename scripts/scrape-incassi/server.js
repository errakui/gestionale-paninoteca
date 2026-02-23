/**
 * Server per Railway/Render: espone GET/POST /run che esegue lo scraping.
 * Cron-job.org può chiamare https://tuo-app.up.railway.app/run ogni 6 min con header x-cron-secret.
 *
 * Avvio: node server.js
 * Porta: process.env.PORT || 3001
 */

import http from "http";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const CRON_SECRET = process.env.CRON_SECRET;

function runScrape() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scrape.js"], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, output: out.trim(), code });
      else reject(new Error(err.trim() || out.trim() || `Exit ${code}`));
    });
    child.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, service: "scrape-incassi" }));
    return;
  }

  if (req.url === "/run" && (req.method === "POST" || req.method === "GET")) {
    const secret = req.headers["x-cron-secret"] || req.headers["x-api-key"];
    if (CRON_SECRET && secret !== CRON_SECRET) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const result = await runScrape();
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err.message) }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log("Server scrape-incassi in ascolto su porta", PORT);
});
