import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { feedbinRequest, jsonResult, textResult } from "../feedbin-client.js";

export function registerContentTools(server: McpServer) {
  server.tool(
    "save_page",
    "Save a webpage URL as a Feedbin entry (read-later). Returns the created entry.",
    {
      url: z.string().describe("The webpage URL to save"),
      title: z.string().optional().describe("Optional custom title"),
    },
    async ({ url, title }) => {
      const body: Record<string, string> = { url };
      if (title) body.title = title;
      const { data } = await feedbinRequest("/pages.json", {
        method: "POST",
        body,
      });
      return jsonResult(data);
    }
  );

  server.tool(
    "get_icons",
    "Get favicons for all subscribed feeds",
    {},
    async () => {
      const { data } = await feedbinRequest("/icons.json");
      return jsonResult(data);
    }
  );

  server.tool(
    "import_opml",
    "Import feeds from an OPML file (provide the XML content as a string)",
    {
      opml_xml: z.string().describe("The OPML XML content to import"),
    },
    async ({ opml_xml }) => {
      const { data } = await feedbinRequest("/imports.json", {
        method: "POST",
        contentType: "text/xml",
        rawBody: opml_xml,
      });
      return jsonResult(data);
    }
  );

  server.tool(
    "get_import_status",
    "Check the status of an OPML import job",
    {
      id: z.number().describe("The import ID to check"),
    },
    async ({ id }) => {
      const { data } = await feedbinRequest(`/imports/${id}.json`);
      return jsonResult(data);
    }
  );

  server.tool(
    "verify_credentials",
    "Verify that your Feedbin credentials are valid",
    {},
    async () => {
      try {
        await feedbinRequest("/authentication.json");
        return textResult("Credentials are valid.");
      } catch {
        return textResult("Credentials are invalid or Feedbin is unreachable.");
      }
    }
  );
}
