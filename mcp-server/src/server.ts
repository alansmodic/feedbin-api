import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { configure } from "./feedbin-client.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerEntryTools } from "./tools/entries.js";
import { registerReadingTools } from "./tools/reading.js";
import { registerOrganizationTools } from "./tools/organization.js";
import { registerContentTools } from "./tools/content.js";

/**
 * Validates that Feedbin credentials are present and configures the client.
 */
export function initCredentials() {
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
}

/**
 * Creates and returns an McpServer with all Feedbin tools registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "feedbin",
    version: "1.0.0",
  });

  registerSubscriptionTools(server);
  registerEntryTools(server);
  registerReadingTools(server);
  registerOrganizationTools(server);
  registerContentTools(server);

  return server;
}
