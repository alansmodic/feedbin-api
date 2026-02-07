# Feedbin MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that connects AI assistants to your [Feedbin](https://feedbin.com/) RSS reader. Manage feeds, read articles, organize with tags, and more — all through natural language.

## What This Does

This server exposes your Feedbin account as a set of tools that any MCP-compatible client (Claude Desktop, Claude Code, Cursor, etc.) can use. For example, you can ask:

- "What are my unread articles?"
- "Subscribe me to https://example.com/blog"
- "Star that article about Rust"
- "Show me everything tagged 'tech'"
- "Save this URL for later reading"

## Two Transport Modes

| Mode | Entry Point | Use Case |
|---|---|---|
| **stdio** (default) | `build/index.js` | Local — Claude Desktop / Claude Code launches it for you |
| **HTTP** | `build/http.js` | Remote — deploy to Railway, a VPS, or Docker |

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- A **Feedbin account** (https://feedbin.com/)

## Quick Start (Local / stdio)

```bash
cd mcp-server
npm install
npm run build

# Test that it starts (Ctrl+C to stop)
FEEDBIN_EMAIL=you@example.com FEEDBIN_PASSWORD=your-password npm start
```

Then configure your MCP client (see "Connecting to an MCP Client" below).

## Configuration

### Environment Variables

| Variable | Required | Where | Description |
|---|---|---|---|
| `FEEDBIN_EMAIL` | Yes | Both modes | Your Feedbin account email |
| `FEEDBIN_PASSWORD` | Yes | Both modes | Your Feedbin account password |
| `MCP_API_KEY` | HTTP mode only | HTTP mode | Bearer token clients must send to authenticate |
| `PORT` | No | HTTP mode | Port to listen on (default: 3000, Railway sets automatically) |

### Generating an API Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value — you'll set it as `MCP_API_KEY` on your server and use it in your MCP client config.

## Connecting to an MCP Client

### Local (stdio mode)

#### Claude Desktop

Add to your config file:
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

#### Claude Code (CLI)

```bash
claude mcp add feedbin \
  -e FEEDBIN_EMAIL=you@example.com \
  -e FEEDBIN_PASSWORD=your-password \
  -- node /absolute/path/to/mcp-server/build/index.js
```

#### Cursor

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

### Remote (HTTP mode)

For remote servers (Railway, VPS, etc.), configure your MCP client to connect via URL:

#### Claude Desktop (remote)

```json
{
  "mcpServers": {
    "feedbin": {
      "url": "https://your-railway-app.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

#### Claude Code (remote)

```bash
claude mcp add feedbin \
  --transport http \
  --header "Authorization: Bearer YOUR_MCP_API_KEY" \
  https://your-railway-app.up.railway.app/mcp
```

## Deploying to Railway

Railway can deploy directly from your GitHub repo. Here's the step-by-step:

### 1. Generate your API key locally

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Save this — e.g. a1b2c3d4e5f6...
```

### 2. Create a new Railway project

- Go to [railway.app](https://railway.app) and click **New Project** > **Deploy from GitHub repo**
- Select this repository

### 3. Configure the service

In Railway's service settings:

- **Root Directory**: `mcp-server`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:http`

### 4. Set environment variables

In Railway's **Variables** tab, add:

| Variable | Value |
|---|---|
| `FEEDBIN_EMAIL` | your Feedbin email |
| `FEEDBIN_PASSWORD` | your Feedbin password |
| `MCP_API_KEY` | the key you generated in step 1 |

Railway sets `PORT` automatically — you don't need to add it.

### 5. Deploy

Railway will build and deploy. Once live, you'll get a URL like `https://your-app.up.railway.app`.

### 6. Verify

```bash
curl https://your-app.up.railway.app/health
# Should return: {"status":"ok","server":"feedbin-mcp"}
```

### 7. Connect your MCP client

Use the URL `https://your-app.up.railway.app/mcp` with your API key as shown in the "Remote (HTTP mode)" section above.

### Security Notes

- Your **Feedbin credentials** are stored only as Railway environment variables — encrypted at rest, never in code, never in logs.
- The **MCP_API_KEY** acts as a password for your MCP server. Anyone with this key can read/modify your Feedbin data through the server. Keep it secret.
- Railway provides **HTTPS by default** — all traffic between your MCP client and the server is encrypted.
- The `/health` endpoint is unauthenticated (it returns no sensitive data) so Railway can use it for health checks.

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

## Development

```bash
# stdio mode (for local MCP clients)
FEEDBIN_EMAIL=you@example.com FEEDBIN_PASSWORD=your-password npm run dev

# HTTP mode (for testing remote deployment locally)
FEEDBIN_EMAIL=you@example.com FEEDBIN_PASSWORD=your-password MCP_API_KEY=test-key npm run dev:http
```

## Troubleshooting

- **"FEEDBIN_EMAIL and FEEDBIN_PASSWORD environment variables are required"** — Set the env vars before starting.
- **"MCP_API_KEY environment variable is required"** — Only needed for HTTP mode (`start:http`). Generate one with the command above.
- **401 errors from Feedbin** — Check your email/password. Use `verify_credentials` tool to test.
- **403 from the MCP server** — Your `MCP_API_KEY` doesn't match. Check the `Authorization: Bearer ...` header.
- **Tools not appearing in Claude** — Restart Claude Desktop after editing config. Check the config file path is correct.
- **"Cannot find module" errors** — Run `npm run build` first. The server runs from compiled JS in `build/`.
