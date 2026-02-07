import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { feedbinRequest, jsonResult, textResult } from "../feedbin-client.js";

export function registerOrganizationTools(server: McpServer) {
  // --- Taggings (feed-tag associations) ---

  server.tool(
    "list_taggings",
    "List all taggings (feed-to-tag associations). Shows which feeds belong to which tags/folders.",
    {},
    async () => {
      const { data } = await feedbinRequest("/taggings.json");
      return jsonResult(data);
    }
  );

  server.tool(
    "tag_feed",
    "Tag a feed (add it to a folder/category)",
    {
      feed_id: z.number().describe("The feed ID to tag"),
      name: z.string().describe("The tag name (folder/category)"),
    },
    async ({ feed_id, name }) => {
      const { data } = await feedbinRequest("/taggings.json", {
        method: "POST",
        body: { feed_id, name },
      });
      return jsonResult(data);
    }
  );

  server.tool(
    "untag_feed",
    "Remove a tag from a feed",
    {
      tagging_id: z.number().describe("The tagging ID to delete"),
    },
    async ({ tagging_id }) => {
      await feedbinRequest(`/taggings/${tagging_id}.json`, { method: "DELETE" });
      return textResult(`Removed tagging ${tagging_id}.`);
    }
  );

  server.tool(
    "rename_tag",
    "Rename a tag across all feeds that use it",
    {
      old_name: z.string().describe("Current tag name"),
      new_name: z.string().describe("New tag name"),
    },
    async ({ old_name, new_name }) => {
      await feedbinRequest("/tags.json", {
        method: "POST",
        body: { old_name, new_name },
      });
      return textResult(`Renamed tag "${old_name}" to "${new_name}".`);
    }
  );

  server.tool(
    "delete_tag",
    "Delete a tag (removes it from all feeds, does not delete the feeds themselves)",
    {
      name: z.string().describe("Tag name to delete"),
    },
    async ({ name }) => {
      await feedbinRequest("/tags.json", {
        method: "DELETE",
        body: { name },
      });
      return textResult(`Deleted tag "${name}".`);
    }
  );

  // --- Saved searches ---

  server.tool(
    "list_saved_searches",
    "List all saved searches",
    {},
    async () => {
      const { data } = await feedbinRequest("/saved_searches.json");
      return jsonResult(data);
    }
  );

  server.tool(
    "create_saved_search",
    "Create a saved search query (e.g. 'javascript is:unread')",
    {
      name: z.string().describe("Display name for the saved search"),
      query: z.string().describe("Search query string"),
    },
    async ({ name, query }) => {
      const { data } = await feedbinRequest("/saved_searches.json", {
        method: "POST",
        body: { name, query },
      });
      return jsonResult(data);
    }
  );

  server.tool(
    "run_saved_search",
    "Run a saved search and get matching entry IDs (or full entries with include_entries)",
    {
      id: z.number().describe("Saved search ID"),
      include_entries: z
        .boolean()
        .optional()
        .describe("Return full entry objects instead of just IDs"),
      page: z.number().optional().describe("Page number for results"),
    },
    async ({ id, include_entries, page }) => {
      const params: Record<string, string | number | boolean | undefined> = {
        include_entries,
        page,
      };
      const { data } = await feedbinRequest(`/saved_searches/${id}.json`, { params });
      return jsonResult(data);
    }
  );

  server.tool(
    "delete_saved_search",
    "Delete a saved search",
    {
      id: z.number().describe("Saved search ID to delete"),
    },
    async ({ id }) => {
      await feedbinRequest(`/saved_searches/${id}.json`, { method: "DELETE" });
      return textResult(`Deleted saved search ${id}.`);
    }
  );
}
