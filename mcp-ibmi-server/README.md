# mcp-ibmi-server — IBM i SSH Tool Wrapper

A custom MCP server that wraps IBM i SSH interactions as structured tools for Bob 2.0.

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org) (LTS recommended)
- A PUB400 account and SSH key — see root `.env.example`

---

## Setup

### 1. Install dependencies

```bash
cd mcp-ibmi-server
npm install
```

### 2. Build

```bash
npm run build
```

Output goes to `dist/`. The compiled entry point is `dist/index.js`.

### 3. Load credentials before starting Bob

The server reads credentials from environment variables — **never** from the MCP config or code.

**Mac/Linux:**
```bash
export $(grep -v '^#' ../.env | xargs)
```

**Windows PowerShell:**
```powershell
Get-Content ../.env | Where-Object { $_ -notmatch '^#' -and $_ -ne '' } |
  ForEach-Object { $k,$v = $_ -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v,'Process') }
```

Then start Bob in the same shell session.

---

## MCP Tools

All tools are registered under the server name `ibmi`, so Bob calls them as `mcp__ibmi__<tool_name>`.

| Tool | Description | Parameters |
|---|---|---|
| `check_connection` | TCP reachability probe — no auth | _(none)_ |
| `get_library_list` | Returns effective library list via `QSYS2.LIBRARY_LIST_INFO` | _(none)_ |
| `discover_object` | Find object(s) by name via `QSYS2.OBJECT_STATISTICS` | `object_name`, `object_type?` |
| `get_program_info` | Source file/member/compiler via `QSYS2.PROGRAM_INFO` | `program_name`, `program_library` |
| `get_program_refs` | Outbound dependencies via `QSYS2.PROGRAM_OBJECT_INFO` / `DSPPGMREF` | `program_name`, `program_library` |
| `execute_ibmi_command` | Generic CL/SQL passthrough — returns stdout, stderr, exit_code | `command` |

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `IBMI_HOST` | IBM i hostname | `pub400.com` |
| `IBMI_USER` | SSH username | `myuser` |
| `IBMI_SSH_KEY_PATH` | Absolute path to SSH private key | `/home/user/.ssh/id_ed25519` |
| `IBMI_PORT` | SSH port (default 22) | `22` |

---

## Project Structure

```
mcp-ibmi-server/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # MCP server entry point — tool registration
    └── ssh-client.ts   # SSH session helpers: checkConnection, runCommand, runSql
```

---

## Security Notes

- Credentials are **never** stored in `package.json`, `tsconfig.json`, MCP config, or source code
- The `check_connection` tool does a TCP probe only — it does not authenticate
- All IBM i operations are **read-only** — no objects are created, changed, or deleted
- SSH private key files must **never** be committed to source control (covered by `.gitignore`)
