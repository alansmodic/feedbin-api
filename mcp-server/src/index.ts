#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configure } from "./feedbin-client.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerEntryTools } from "./tools/entries.js";
import { registerReadingTools } from "./tools/reading.js";
import { registerOrganizationTools } from "./tools/organization.js";
import { registerContentTools } from "./tools/content.js";

// --- Read credentials from environment ---
const email = process.env.FEEDBIN_EMAIL;
const password = process.env.FEEDBIN_PASSWORD;

if (!email || !password) {
  console.error(
    "Error: FEEDBIN_EMAIL and FEEDBIN_PASSWORD environment variables are required.\n" +
      "Set them before starting the server:\n" +
      "  export FEEDBIN_EMAIL=you@example.com\n" +
      "  export FEEDBIN_PASSWORD=your-password"
  );
  process.exit(1);
}

configure(email, password);

// --- Create server and register tools ---
const server = new McpServer({
  name: "feedbin",
  version: "1.0.0",
});

registerSubscriptionTools(server);
registerEntryTools(server);
registerReadingTools(server);
registerOrganizationTools(server);
registerContentTools(server);

// --- Connect via stdio transport ---
const transport = new StdioServerTransport();
await server.connect(transport);

// Log to stderr (stdout is reserved for MCP protocol messages)
console.error("Feedbin MCP server running on stdio");
