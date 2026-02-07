import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { feedbinRequest, jsonResult } from "../feedbin-client.js";

export function registerEntryTools(server: McpServer) {
  server.tool(
    "list_entries",
    "List feed entries (articles) with optional filters. Returns paginated results (100 per page).",
    {
      page: z.number().optional().describe("Page number (default 1)"),
      since: z
        .string()
        .optional()
        .describe("ISO 8601 timestamp — only entries created after this date"),
      ids: z
        .string()
        .optional()
        .describe("Comma-separated entry IDs to fetch (max 100)"),
      read: z
        .boolean()
        .optional()
        .describe("Filter by read status: true=read only, false=unread only"),
      starred: z
        .boolean()
        .optional()
        .describe("Filter by starred status"),
      per_page: z
        .number()
        .optional()
        .describe("Results per page (default 100)"),
      mode: z
        .enum(["extended"])
        .optional()
        .describe("Set to 'extended' for extra metadata (images, enclosures, etc.)"),
      include_content_diff: z
        .boolean()
        .optional()
        .describe("Include HTML diff if the entry was updated"),
    },
    async ({ page, since, ids, read, starred, per_page, mode, include_content_diff }) => {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        since,
        ids,
        read,
        starred,
        per_page,
        mode,
        include_content_diff,
      };
      const { data, headers } = await feedbinRequest("/entries.json", { params });
      const count = headers.get("X-Feedbin-Record-Count");
      const link = headers.get("Link");
      const meta: string[] = [];
      if (count) meta.push(`Total entries: ${count}`);
      if (link) meta.push(`Pagination: ${link}`);
      const result = meta.length
        ? `${meta.join("\n")}\n\n${JSON.stringify(data, null, 2)}`
        : JSON.stringify(data, null, 2);
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "get_entry",
    "Get a single entry by ID with full content",
    {
      id: z.number().describe("The entry ID"),
      mode: z
        .enum(["extended"])
        .optional()
        .describe("Set to 'extended' for extra metadata"),
    },
    async ({ id, mode }) => {
      const params: Record<string, string | undefined> = { mode };
      const { data } = await feedbinRequest(`/entries/${id}.json`, { params });
      return jsonResult(data);
    }
  );

  server.tool(
    "get_feed_entries",
    "Get entries for a specific feed",
    {
      feed_id: z.number().describe("The feed ID"),
      page: z.number().optional().describe("Page number"),
      since: z.string().optional().describe("ISO 8601 timestamp filter"),
      mode: z
        .enum(["extended"])
        .optional()
        .describe("Set to 'extended' for extra metadata"),
    },
    async ({ feed_id, page, since, mode }) => {
      const params: Record<string, string | number | undefined> = { page, since, mode };
      const { data } = await feedbinRequest(`/feeds/${feed_id}/entries.json`, { params });
      return jsonResult(data);
    }
  );

  server.tool(
    "get_feed",
    "Get metadata for a specific feed (title, URL, site URL)",
    {
      id: z.number().describe("The feed ID"),
    },
    async ({ id }) => {
      const { data } = await feedbinRequest(`/feeds/${id}.json`);
      return jsonResult(data);
    }
  );
}
