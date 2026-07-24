/* ============================================================
   server.js — WorkHub local server (Node thuần, không thư viện)
   - Phục vụ web tĩnh (index.html, assets, processes)
   - API lưu task + attachment vào ./tasks (mặc định = root/tasks)
   Chạy:  node server.js       (mở http://localhost:8080)
   Đổi thư mục dữ liệu:  WORKHUB_DATA=/path node server.js
   Đổi cổng:             PORT=3000 node server.js
   ============================================================ */
"use strict";

const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const url = require("url");

const ROOT = __dirname;
const DATA_DIR = process.env.WORKHUB_DATA
  ? path.resolve(process.env.WORKHUB_DATA)
  : path.join(ROOT, "tasks");
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".csv": "text/csv",
  ".eml": "message/rfc822", ".msg": "application/octet-stream",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

/* ---------- helpers ---------- */
// Chỉ cho phép 1 segment an toàn (không slash, không "..") → chống path traversal.
function safeSeg(s) {
  if (!s || s === "." || s === ".." || !/^[\w.\-]+$/.test(s)) return null;
  return s;
}
function send(res, code, body, headers) { res.writeHead(code, headers || {}); res.end(body); }
function sendJSON(res, code, obj) {
  send(res, code, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}
async function ensureDir(p) { await fsp.mkdir(p, { recursive: true }); }

async function loadAll() {
  await ensureDir(DATA_DIR);
  const out = [];
  const entries = await fsp.readdir(DATA_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    try {
      const raw = await fsp.readFile(path.join(DATA_DIR, e.name, "task.json"), "utf8");
      out.push(JSON.parse(raw));
    } catch (err) { /* thư mục không có task.json → bỏ qua */ }
  }
  return out;
}

/* ---------- request handler ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const p = decodeURIComponent(parsed.pathname);

    // ===== API =====
    if (p === "/api/info" && req.method === "GET") {
      return sendJSON(res, 200, { path: DATA_DIR, name: path.basename(DATA_DIR) });
    }

    if (p === "/api/tasks" && req.method === "GET") {
      return sendJSON(res, 200, await loadAll());
    }

    let m = p.match(/^\/api\/tasks\/([^/]+)$/);
    if (m) {
      const id = safeSeg(m[1]);
      if (!id) return sendJSON(res, 400, { error: "bad id" });
      const dir = path.join(DATA_DIR, id);
      if (req.method === "PUT") {
        let task;
        try { task = JSON.parse((await readBody(req)).toString("utf8")); }
        catch (e) { return sendJSON(res, 400, { error: "bad json" }); }
        await ensureDir(dir);
        await fsp.writeFile(path.join(dir, "task.json"), JSON.stringify(task, null, 2));
        return sendJSON(res, 200, { ok: true });
      }
      if (req.method === "DELETE") {
        await fsp.rm(dir, { recursive: true, force: true });
        return sendJSON(res, 200, { ok: true });
      }
    }

    m = p.match(/^\/api\/tasks\/([^/]+)\/files$/);
    if (m && req.method === "POST") {
      const id = safeSeg(m[1]);
      if (!id) return sendJSON(res, 400, { error: "bad id" });
      const orig = String(parsed.query.name || "file");
      const safe = orig.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
      const storedAs = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6) + "__" + safe;
      const fdir = path.join(DATA_DIR, id, "files");
      await ensureDir(fdir);
      await fsp.writeFile(path.join(fdir, storedAs), await readBody(req));
      return sendJSON(res, 200, { name: orig, storedAs: storedAs });
    }

    m = p.match(/^\/api\/tasks\/([^/]+)\/files\/([^/]+)$/);
    if (m && req.method === "GET") {
      const id = safeSeg(m[1]), sa = safeSeg(m[2]);
      if (!id || !sa) return send(res, 400, "bad");
      const fp = path.join(DATA_DIR, id, "files", sa);
      try {
        const data = await fsp.readFile(fp);
        const origPart = sa.split("__").pop() || sa;
        const ext = path.extname(origPart).toLowerCase();
        return send(res, 200, data, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Content-Disposition": 'inline; filename="' + origPart.replace(/"/g, "") + '"',
        });
      } catch (e) { return send(res, 404, "not found"); }
    }

    if (p.indexOf("/api/") === 0) return sendJSON(res, 404, { error: "unknown endpoint" });

    // ===== static files =====
    let fp = p === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, p);
    if (!fp.startsWith(ROOT)) return send(res, 403, "forbidden");
    try {
      const stat = await fsp.stat(fp);
      if (stat.isDirectory()) fp = path.join(fp, "index.html");
      const data = await fsp.readFile(fp);
      return send(res, 200, data, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream" });
    } catch (e) {
      return send(res, 404, "404 Not Found");
    }
  } catch (e) {
    sendJSON(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log("WorkHub server  ->  http://localhost:" + PORT);
  console.log("Task lưu tại     ->  " + DATA_DIR);
});
