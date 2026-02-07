import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { feedbinRequest, jsonResult, textResult } from "../feedbin-client.js";

export function registerReadingTools(server: McpServer) {
  // --- Unread entries ---

  server.tool(
    "get_unread_entries",
    "Get all unread entry IDs. Use list_entries with the IDs to fetch full content.",
    {},
    async () => {
      const { data } = await feedbinRequest("/unread_entries.json");
      return jsonResult(data);
    }
  );

  server.tool(
    "mark_entries_read",
    "Mark entries as read",
    {
      entry_ids: z
        .array(z.number())
        .describe("Array of entry IDs to mark as read (max 1000)"),
    },
    async ({ entry_ids }) => {
      await feedbinRequest("/unread_entries.json", {
        method: "DELETE",
        body: { unread_entries: entry_ids },
      });
      return textResult(`Marked ${entry_ids.length} entries as read.`);
    }
  );

  server.tool(
    "mark_entries_unread",
    "Mark entries as unread",
    {
      entry_ids: z
        .array(z.number())
        .describe("Array of entry IDs to mark as unread (max 1000)"),
    },
    async ({ entry_ids }) => {
      await feedbinRequest("/unread_entries.json", {
        method: "POST",
        body: { unread_entries: entry_ids },
      });
      return textResult(`Marked ${entry_ids.length} entries as unread.`);
    }
  );

  // --- Starred entries ---

  server.tool(
    "get_starred_entries",
    "Get all starred entry IDs",
    {},
    async () => {
      const { data } = await feedbinRequest("/starred_entries.json");
      return jsonResult(data);
    }
  );

  server.tool(
    "star_entries",
    "Star (favorite) entries",
    {
      entry_ids: z
        .array(z.number())
        .describe("Array of entry IDs to star (max 1000)"),
    },
    async ({ entry_ids }) => {
      await feedbinRequest("/starred_entries.json", {
        method: "POST",
        body: { starred_entries: entry_ids },
      });
      return textResult(`Starred ${entry_ids.length} entries.`);
    }
  );

  server.tool(
    "unstar_entries",
    "Unstar (unfavorite) entries",
    {
      entry_ids: z
        .array(z.number())
        .describe("Array of entry IDs to unstar (max 1000)"),
    },
    async ({ entry_ids }) => {
      await feedbinRequest("/starred_entries.json", {
        method: "DELETE",
        body: { starred_entries: entry_ids },
      });
      return textResult(`Unstarred ${entry_ids.length} entries.`);
    }
  );

  // --- Recently read ---

  server.tool(
    "get_recently_read",
    "Get recently read entry IDs (reading history)",
    {},
    async () => {
      const { data } = await feedbinRequest("/recently_read_entries.json");
      return jsonResult(data);
    }
  );

  // --- Updated entries ---

  server.tool(
    "get_updated_entries",
    "Get entry IDs for entries whose content has been updated",
    {
      since: z
        .string()
        .optional()
        .describe("ISO 8601 timestamp — only return entries updated after this date"),
    },
    async ({ since }) => {
      const params: Record<string, string | undefined> = { since };
      const { data } = await feedbinRequest("/updated_entries.json", { params });
      return jsonResult(data);
    }
  );
}
