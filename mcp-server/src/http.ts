#!/usr/bin/env node

/**
 * Feedbin MCP Server — HTTP transport (for Railway, VPS, Docker, etc.)
 *
 * Environment variables:
 *   FEEDBIN_EMAIL     - Your Feedbin email (required)
 *   FEEDBIN_PASSWORD  - Your Feedbin password (required)
 *   MCP_API_KEY       - Bearer token that clients must send to authenticate (required)
 *   PORT              - Port to listen on (default: 3000, Railway sets this automatically)
 *
 * Usage:
 *   FEEDBIN_EMAIL=... FEEDBIN_PASSWORD=... MCP_API_KEY=my-secret-key node build/http.js
 *
 * Clients connect to: POST/GET/DELETE http://your-host:PORT/mcp
 * with header: Authorization: Bearer <MCP_API_KEY>
 */

import { randomUUID } from "node:crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { initCredentials, createServer } from "./server.js";
import type { Request, Response, NextFunction } from "express";

// --- Validate config ---
initCredentials();

const API_KEY = process.env.MCP_API_KEY;
if (!API_KEY) {
  console.error(
    "Error: MCP_API_KEY environment variable is required for HTTP mode.\n" +
      "This is the bearer token clients must provide to access your server.\n" +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || "3000", 10);

// --- Bearer token auth middleware ---
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer <MCP_API_KEY>" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== API_KEY) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}

// --- Express app ---
const app = express();
app.use(express.json());

// Health check (no auth needed — useful for Railway health checks)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "feedbin-mcp" });
});

// --- Session management ---
const transports = new Map<string, StreamableHTTPServerTransport>();

function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some((msg) => msg?.method === "initialize");
  }
  return (body as Record<string, unknown>)?.method === "initialize";
}

// POST /mcp — Initialize sessions or send messages
app.post("/mcp", requireAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId)!;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport);
        console.error(`Session initialized: ${sid}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
        console.error(`Session closed: ${transport.sessionId}`);
      }
    };

    const server = createServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid or missing session. Send an initialize request first." },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp — SSE streaming for server-to-client notifications
app.get("/mcp", requireAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  await transports.get(sessionId)!.handleRequest(req, res);
});

// DELETE /mcp — Terminate a session
app.delete("/mcp", requireAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  await transports.get(sessionId)!.handleRequest(req, res);
});

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  console.error(`Feedbin MCP server (HTTP) listening on port ${PORT}`);
  console.error(`Endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.error(`Health check: http://0.0.0.0:${PORT}/health`);
});
