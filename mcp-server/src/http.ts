#!/usr/bin/env node

/**
 * HTTP entry point for hosting the Feedbin MCP server remotely (Railway, Fly.io, etc.).
 *
 * Uses the Streamable HTTP transport so MCP clients can connect over the network.
 * Requires a bearer token (API_TOKEN env var) to prevent unauthorized access.
 * The token can be provided either as a Bearer token in the Authorization header
 * or as a `token` query parameter (e.g. /mcp?token=YOUR_TOKEN).
 *
 * Environment variables:
 *   FEEDBIN_EMAIL    – your Feedbin email (required)
 *   FEEDBIN_PASSWORD – your Feedbin password (required)
 *   API_TOKEN        – secret bearer token for authenticating MCP clients (required)
 *   PORT             – port to listen on (default: 3000, Railway sets this automatically)
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { configure } from "./feedbin-client.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerEntryTools } from "./tools/entries.js";
import { registerReadingTools } from "./tools/reading.js";
import { registerOrganizationTools } from "./tools/organization.js";
import { registerContentTools } from "./tools/content.js";

// --- Validate required environment variables ---
const email = process.env.FEEDBIN_EMAIL;
const password = process.env.FEEDBIN_PASSWORD;
const apiToken = process.env.API_TOKEN;

if (!email || !password) {
  console.error(
    "Error: FEEDBIN_EMAIL and FEEDBIN_PASSWORD environment variables are required."
  );
  process.exit(1);
}

if (!apiToken) {
  console.error(
    "Error: API_TOKEN environment variable is required.\n" +
      "Generate a random secret (e.g. `openssl rand -hex 32`) and set it as API_TOKEN.\n" +
      "MCP clients must send this token as a Bearer token in the Authorization header\n" +
      "or as a ?token= query parameter."
  );
  process.exit(1);
}

configure(email, password);

// --- Create MCP server and register tools ---
function createMcpServer(): McpServer {
  const server = new McpServer({ name: "feedbin", version: "1.0.0" });
  registerSubscriptionTools(server);
  registerEntryTools(server);
  registerReadingTools(server);
  registerOrganizationTools(server);
  registerContentTools(server);
  return server;
}

// Track transports by session ID for routing subsequent requests
const transports = new Map<string, StreamableHTTPServerTransport>();

// --- Token check (Authorization header or ?token= query parameter) ---
function authenticateRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const auth = req.headers.authorization;
  if (auth === `Bearer ${apiToken}`) {
    return true;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const queryToken = url.searchParams.get("token");
  if (queryToken === apiToken) {
    return true;
  }

  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
  return false;
}

// --- HTTP request handler ---
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  // Health check — no auth required
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // All /mcp requests require auth
  if (url.pathname === "/mcp") {
    if (!authenticateRequest(req, res)) return;

    // Check for existing session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Route to existing transport
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    if (sessionId && !transports.has(sessionId)) {
      // Unknown session
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }

    // New session — create transport and wire up a fresh MCP server
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }

  // Anything else → 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

// --- Start server ---
const port = parseInt(process.env.PORT ?? "3000", 10);
const server = createServer(handleRequest);

server.listen(port, () => {
  console.error(`Feedbin MCP server (HTTP) listening on port ${port}`);
  console.error("POST/GET/DELETE /mcp — MCP Streamable HTTP endpoint");
  console.error("GET /health — health check");
});
