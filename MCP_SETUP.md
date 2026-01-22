# GitHub MCP Server Setup Guide

This project is configured to use the GitHub MCP Server, which enables Claude Code to interact with GitHub repositories, issues, and pull requests.

## Prerequisites

- Node.js 18+ installed
- Claude Code CLI
- GitHub account

## Installation Steps

### 1. Install GitHub MCP Server

The GitHub MCP Server is already installed globally:

```bash
npm install -g @modelcontextprotocol/server-github
```

**Installed at:** `/opt/node22/bin/mcp-server-github`

### 2. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Create a new token with the following scopes:
   - ✅ `repo` - Full repository access
   - ✅ `workflow` - GitHub Actions read/write
   - ✅ `read:org` - Read organization info

3. **Token name:** `Claude Code - Share Deck Manager`
4. **Expiration:** 90 days (recommended)
5. Click **Generate token** and copy the token

### 3. Configure MCP Server

1. Copy the example configuration:
   ```bash
   cp .mcp.json.example .mcp.json
   ```

2. Edit `.mcp.json` and replace `YOUR_GITHUB_PAT_HERE` with your actual GitHub token:
   ```bash
   nano .mcp.json
   # or
   vim .mcp.json
   ```

   The file should look like:
   ```json
   {
     "$schema": "https://json.schemastore.org/mcp.json",
     "mcpServers": {
       "github": {
         "command": "/opt/node22/bin/mcp-server-github",
         "env": {
           "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
         }
       }
     }
   }
   ```

3. **IMPORTANT:** Never commit `.mcp.json` to git (it's already in `.gitignore`)

### 4. Restart Claude Code

After creating `.mcp.json`, restart Claude Code CLI. You'll be prompted to approve the GitHub MCP Server.

## Available Features

Once enabled, Claude Code can:

### 📦 Repository Operations
- Create, read, update repositories
- File operations (read/write)
- Commit history
- Branch management

### 🐛 Issue Management
- Create, update, close issues
- Add comments
- Manage labels
- Search issues

### 🔀 Pull Requests
- Create, update, merge PRs
- Add review comments
- Check PR status
- Approve/request changes

### 🔍 Search
- Code search across repositories
- Issue/PR search
- Repository search

## Security Notes

⚠️ **IMPORTANT:**
- **Never commit** `.mcp.json` to version control
- Store your GitHub token securely
- Rotate tokens regularly (every 90 days)
- Use fine-grained tokens with minimal required scopes
- Revoke tokens immediately if compromised

## Troubleshooting

### MCP Server not found
```bash
# Verify installation
which mcp-server-github
# Should return: /opt/node22/bin/mcp-server-github
```

### Permission denied
- Check that the token has the required scopes
- Verify the token hasn't expired
- Check GitHub account has access to the repository

### Server not responding
- Restart Claude Code CLI
- Check `.mcp.json` syntax is valid JSON
- Verify the command path is correct

## Example Usage

After setup, you can ask Claude Code to:

```
Create a pull request to master with all current changes
```

```
List all open issues in this repository
```

```
Search for TODO comments in the codebase
```

```
Create a new issue titled "Add user authentication"
```

## Files

- `.mcp.json.example` - Template configuration file (committed to git)
- `.mcp.json` - Your actual configuration with token (**NOT committed**)
- `.gitignore` - Contains `.mcp.json` to prevent accidental commits

## References

- [MCP Documentation](https://modelcontextprotocol.io/)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)

---

**Setup Date:** 2026-01-22
**MCP Server Version:** Latest
**Node.js:** 22.x
