// input: 本地 HTTP 请求
// output: 可视化 Studio 工作台与发布 API

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectProject } from "./core/project.mjs";
import { publishProject } from "./core/publisher.mjs";
import { resolveAuthContext } from "./core/config.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const appRoot = join(root, "app");

export async function startStudioServer(options = {}) {
  const port = Number(options.port ?? 4177);
  const server = createServer(async (req, res) => {
    try {
      if (req.method === "POST" && req.url === "/api/inspect") {
        const body = await readJson(req);
        return sendJson(res, await inspectProject(body.appDir || "."));
      }
      if (req.method === "POST" && req.url === "/api/publish") {
        const body = await readJson(req);
        const auth = await resolveAuthContext(body);
        return sendJson(res, await publishProject({ ...body, ...auth }));
      }
      return serveStatic(req, res);
    } catch (error) {
      return sendJson(res, { error: error?.message || String(error) }, 500);
    }
  });
  await new Promise((resolve) => server.listen(port, resolve));
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return { server, url: `http://127.0.0.1:${actualPort}` };
}

async function serveStatic(req, res) {
  const pathname = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  if (pathname === "/favicon.ico") return sendNoContent(res);
  const safePath = pathname.replace(/\.\./g, "");
  const filePath = join(appRoot, safePath);
  let content;
  try {
    content = await readFile(filePath);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") {
      return sendNotFound(res);
    }
    throw error;
  }
  const type = contentType(filePath);
  res.writeHead(200, { "Content-Type": type });
  res.end(content);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendNoContent(res) {
  res.writeHead(204, { "Content-Length": "0" });
  res.end();
}

function sendNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
}

function contentType(path) {
  switch (extname(path)) {
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
