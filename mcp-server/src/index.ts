#!/usr/bin/env node

/**
 * Feedbin MCP Server — stdio transport (default)
 *
 * Usage:
 *   FEEDBIN_EMAIL=... FEEDBIN_PASSWORD=... node build/index.js
 *
 * For HTTP transport, use: node build/http.js
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initCredentials, createServer } from "./server.js";

initCredentials();
const server = createServer();

const transport = new StdioServerTransport();
await server.connect(transport);

// Log to stderr (stdout is reserved for MCP protocol messages)
console.error("Feedbin MCP server running on stdio");
