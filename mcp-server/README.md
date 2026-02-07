# Feedbin MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that connects AI assistants to your [Feedbin](https://feedbin.com/) RSS reader. Manage feeds, read articles, organize with tags, and more — all through natural language.

## What This Does

This server exposes your Feedbin account as a set of tools that any MCP-compatible client (Claude Desktop, Claude Code, Cursor, etc.) can use. For example, you can ask:

- "What are my unread articles?"
- "Subscribe me to https://example.com/blog"
- "Star that article about Rust"
- "Show me everything tagged 'tech'"
- "Save this URL for later reading"

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- A **Feedbin account** (https://feedbin.com/)

## Quick Start

```bash
# 1. Install dependencies
cd mcp-server
npm install

# 2. Build
npm run build

# 3. Test that it starts (Ctrl+C to stop)
FEEDBIN_EMAIL=you@example.com FEEDBIN_PASSWORD=your-password npm start
```

## Configuration

The server reads two environment variables:

| Variable | Required | Description |
|---|---|---|
| `FEEDBIN_EMAIL` | Yes | Your Feedbin account email |
| `FEEDBIN_PASSWORD` | Yes | Your Feedbin account password |

## Connecting to an MCP Client

### Claude Desktop

Add this to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "feedbin": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js"],
      "env": {
        "FEEDBIN_EMAIL": "you@example.com",
        "FEEDBIN_PASSWORD": "your-password"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code (CLI)

```bash
claude mcp add feedbin \
  -e FEEDBIN_EMAIL=you@example.com \
  -e FEEDBIN_PASSWORD=your-password \
  -- node /absolute/path/to/mcp-server/build/index.js
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "feedbin": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js"],
      "env": {
        "FEEDBIN_EMAIL": "you@example.com",
        "FEEDBIN_PASSWORD": "your-password"
      }
    }
  }
}
```

## Available Tools

### Feed Management
| Tool | Description |
|---|---|
| `list_subscriptions` | List all feed subscriptions |
| `get_subscription` | Get details for one subscription |
| `subscribe` | Subscribe to a new feed (URL or site URL with auto-discovery) |
| `update_subscription` | Update subscription title |
| `unsubscribe` | Remove a subscription |

### Reading Entries
| Tool | Description |
|---|---|
| `list_entries` | List entries with filters (read/unread/starred, date, pagination) |
| `get_entry` | Get a single entry with full content |
| `get_feed_entries` | Get entries for a specific feed |
| `get_feed` | Get feed metadata |

### Read State & Starring
| Tool | Description |
|---|---|
| `get_unread_entries` | Get all unread entry IDs |
| `mark_entries_read` | Mark entries as read (batch, up to 1000) |
| `mark_entries_unread` | Mark entries as unread |
| `get_starred_entries` | Get all starred entry IDs |
| `star_entries` | Star/favorite entries |
| `unstar_entries` | Unstar entries |
| `get_recently_read` | Get recently read entry IDs |
| `get_updated_entries` | Get IDs of entries with updated content |

### Organization
| Tool | Description |
|---|---|
| `list_taggings` | List all feed-tag associations |
| `tag_feed` | Add a tag to a feed |
| `untag_feed` | Remove a tag from a feed |
| `rename_tag` | Rename a tag across all feeds |
| `delete_tag` | Delete a tag |
| `list_saved_searches` | List saved searches |
| `create_saved_search` | Create a saved search |
| `run_saved_search` | Execute a saved search |
| `delete_saved_search` | Delete a saved search |

### Content & Utilities
| Tool | Description |
|---|---|
| `save_page` | Save a URL as a Feedbin entry (read-later) |
| `get_icons` | Get favicons for subscribed feeds |
| `import_opml` | Import feeds from OPML XML |
| `get_import_status` | Check OPML import progress |
| `verify_credentials` | Test that your credentials work |

## Hosting Options

Since this is new to you, here's a breakdown of where and how you can run this.

### Option 1: Run Locally (Simplest)

Just build and point your MCP client at the built file. The MCP client (Claude Desktop, etc.) starts and stops the server process automatically.

**Pros**: No server to manage, no cost, no network latency.
**Cons**: Only works on your machine.

```bash
npm run build
# Then configure your MCP client as shown above
```

### Option 2: Run on a VPS (DigitalOcean, Linode, Fly.io, etc.)

For remote access, deploy to a cheap VPS and use the HTTP+SSE transport instead of stdio. This requires a small code change (swap `StdioServerTransport` for an HTTP transport).

**Rough steps:**
1. Provision a small VM ($5-6/month on DigitalOcean/Linode)
2. Clone the repo, `npm install && npm run build`
3. Use a process manager like `pm2` to keep it running: `pm2 start build/index.js`
4. Put it behind nginx with HTTPS (Let's Encrypt)
5. Point your MCP client at the HTTP endpoint

**Pros**: Access from anywhere, always on.
**Cons**: Monthly cost, server maintenance, need to secure credentials.

### Option 3: Docker Container

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY build/ ./build/
ENTRYPOINT ["node", "build/index.js"]
```

```bash
docker build -t feedbin-mcp .
docker run -e FEEDBIN_EMAIL=you@example.com -e FEEDBIN_PASSWORD=your-password feedbin-mcp
```

Deploy the container to any container host: **Fly.io**, **Railway**, **Render**, **Google Cloud Run**, **AWS ECS**, etc.

**Pros**: Reproducible, easy to deploy to cloud platforms.
**Cons**: Slight learning curve if you haven't used Docker.

### Option 4: Serverless (AWS Lambda, Cloudflare Workers)

Possible but more complex — MCP's stdio transport doesn't fit serverless natively. You'd need the HTTP+SSE transport and handle cold starts. Generally not recommended unless you have specific scaling needs.

### Recommendation for Getting Started

**Start with Option 1** (local). It requires zero infrastructure, and the MCP client handles the server lifecycle. Once you're comfortable, move to Docker + Fly.io (Option 3) if you want remote access.

## Development

```bash
# Run directly without building (uses tsx)
FEEDBIN_EMAIL=you@example.com FEEDBIN_PASSWORD=your-password npm run dev

# Build and run
npm run build
FEEDBIN_EMAIL=you@example.com FEEDBIN_PASSWORD=your-password npm start
```

## Troubleshooting

- **"FEEDBIN_EMAIL and FEEDBIN_PASSWORD environment variables are required"** — Set the env vars before starting the server.
- **401 errors from Feedbin** — Check your email/password. Use `verify_credentials` tool to test.
- **Tools not appearing in Claude** — Restart Claude Desktop after editing config. Check the config file path is correct.
- **"Cannot find module" errors** — Run `npm run build` first. The server runs from compiled JS in `build/`.
