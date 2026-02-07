import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { feedbinRequest, jsonResult, textResult } from "../feedbin-client.js";

export function registerSubscriptionTools(server: McpServer) {
  server.tool(
    "list_subscriptions",
    "List all RSS/Atom feed subscriptions in your Feedbin account",
    {
      since: z
        .string()
        .optional()
        .describe("ISO 8601 timestamp — only return subscriptions created after this date"),
      mode: z
        .enum(["extended"])
        .optional()
        .describe("Set to 'extended' to include JSON Feed metadata"),
    },
    async ({ since, mode }) => {
      const params: Record<string, string> = {};
      if (since) params.since = since;
      if (mode) params.mode = mode;
      const { data } = await feedbinRequest("/subscriptions.json", { params });
      return jsonResult(data);
    }
  );

  server.tool(
    "get_subscription",
    "Get details for a single subscription by ID",
    {
      id: z.number().describe("The subscription ID"),
    },
    async ({ id }) => {
      const { data } = await feedbinRequest(`/subscriptions/${id}.json`);
      return jsonResult(data);
    }
  );

  server.tool(
    "subscribe",
    "Subscribe to a new RSS/Atom feed. You can provide a feed URL or a site URL (Feedbin will auto-discover the feed).",
    {
      feed_url: z.string().describe("The feed URL or website URL to subscribe to"),
    },
    async ({ feed_url }) => {
      const { data, status } = await feedbinRequest("/subscriptions.json", {
        method: "POST",
        body: { feed_url },
      });
      if (status === 300) {
        return textResult(
          `Multiple feeds found at that URL. Choose one:\n${formatJson(data)}`
        );
      }
      return jsonResult(data);
    }
  );

  server.tool(
    "update_subscription",
    "Update a subscription (e.g. set a custom title)",
    {
      id: z.number().describe("The subscription ID"),
      title: z.string().describe("New custom title for the subscription"),
    },
    async ({ id, title }) => {
      const { data } = await feedbinRequest(`/subscriptions/${id}.json`, {
        method: "PATCH",
        body: { title },
      });
      return jsonResult(data);
    }
  );

  server.tool(
    "unsubscribe",
    "Unsubscribe from a feed (delete a subscription)",
    {
      id: z.number().describe("The subscription ID to remove"),
    },
    async ({ id }) => {
      await feedbinRequest(`/subscriptions/${id}.json`, { method: "DELETE" });
      return textResult(`Unsubscribed from subscription ${id}.`);
    }
  );
}

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
