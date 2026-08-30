# IBM i Application Navigator — Bob 2.0

> **IBM TechXchange 2026 Pre-Conference Dev Day Hackathon**
> An agentic IBM i application navigator that investigates programs, source, and dependencies from a natural-language request.

---

## What This Is

Instead of a new IBM i developer spending significant time manually discovering where a program lives and what it connects to, **Bob investigates the IBM i application and returns the answer in one workflow.**

Bob accepts requests like:

> *"Find program CUSTUPD. Where is its source code, when was it last updated, and what objects are related to it?"*

Bob then independently:
1. Checks whether the live IBM i server (PUB400) is reachable
2. Resolves the effective library list before searching
3. Discovers the exact program object
4. Locates the source file and source member
5. Analyzes dependencies and referenced objects
6. Presents a structured result card and investigation trace

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Bob 2.0 | Skills and MCP server run inside Bob |
| Node.js 18+ | Required to build and run the MCP server |
| SSH client | For live PUB400 connection |
| PUB400 account | Free registration at [pub400.com](https://pub400.com) |

---

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd IBMi_project
cd mcp-ibmi-server && npm install && npm run build && cd ..
```

### 2. Configure credentials

```bash
cp .env.example .env
# Edit .env and fill in IBMI_HOST, IBMI_USER, IBMI_SSH_KEY_PATH, IBMI_PORT
```

> **Security:** `.env` is git-excluded. Never commit credentials, SSH keys, or tokens.

### 3. Load environment before starting Bob

**Mac/Linux:**
```bash
export $(grep -v '^#' .env | xargs)
```

**Windows PowerShell:**
```powershell
Get-Content .env | Where-Object { $_ -notmatch '^#' -and $_ -ne '' } |
  ForEach-Object { $k,$v = $_ -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v,'Process') }
```

### 4. Open project in Bob

Open the `IBMi_project` folder in Bob. The skills in `.bob/skills/` and MCP server in `.bob/mcp.json` are automatically discovered.

---

## Demo Flow (Hackathon 8-Step Script)

| Step | Action | What Bob Does |
|---|---|---|
| 1 | Ask: *"Find CUSTUPD and its source"* | Activates IBM i Application Navigator skill |
| 2 | Connection check | Probes PUB400 — reports 🟢 LIVE or 🟡 FALLBACK |
| 3 | Library list | Resolves libraries in scope before searching |
| 4 | Object discovery | Finds the exact program object and metadata |
| 5 | Source location | Resolves source file, library, and member |
| 6 | Dependency analysis | Lists referenced objects and relationships |
| 7 | Final answer | Structured result card + investigation trace |
| 8 | *(Optional)* | Disconnect from PUB400 → Bob automatically uses local fallback dataset |

⏱️ *Estimated manual investigation: ~15 min | Bob: ~30 sec — illustrative values*

---

## Project Structure

```
IBMi_project/
├── .env.example              # Credential template (safe to commit)
├── .gitignore                # Excludes .env, dist/, keys
├── README.md                 # This file
├── mcp-ibmi-server/          # TypeScript MCP server wrapping IBM i SSH calls
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # MCP server entry point + tool registration
│       └── ssh-client.ts     # SSH session helper (runSql, runCommand)
├── .bob/
│   ├── mcp.json              # Registers mcp-ibmi-server with Bob (no secrets)
│   └── skills/               # All Bob skills — auto-discovered
│       ├── connection-resolver/SKILL.md
│       ├── library-list-resolver/SKILL.md
│       ├── object-discovery/SKILL.md
│       ├── source-locator/SKILL.md
│       ├── dependency-analyzer/SKILL.md
│       └── explanation-orchestrator/SKILL.md   ← Primary demo skill
├── demo-data/
│   ├── ibmi-knowledge-base.md   # Markdown KB — Bob reasons over this on FALLBACK
│   └── objects/
│       ├── library-list.json
│       ├── object-catalog.json
│       ├── program-info.json
│       └── program-refs.json
└── BALA981/
    └── QRPGLESRC/
        └── BALA01.PF             # Sample DDS Physical File source member
```

---

## MCP Tools Provided

| Tool | IBM i Operation | Method |
|---|---|---|
| `check_connection` | TCP reachability probe | SSH port check |
| `get_library_list` | Library list resolution | `QSYS2.LIBRARY_LIST_INFO` |
| `discover_object` | Object discovery | `QSYS2.OBJECT_STATISTICS` |
| `get_program_info` | Source file/member/compiler | `QSYS2.PROGRAM_INFO` |
| `get_program_refs` | Outbound dependencies | `DSPPGMREF` / `QSYS2` |
| `execute_ibmi_command` | Generic CL/SQL passthrough | Raw SSH execution |

---

## Security

- All credentials are read from environment variables — never from config files or skill instructions
- `.env` and SSH key files are excluded from git via `.gitignore`
- All IBM i operations are **read-only** — no objects are created, changed, or deleted
- `.bob/mcp.json` is safe to commit — it contains no secrets

---

## Hackathon Positioning

> *"Instead of a new IBM i developer spending significant time manually discovering where a program lives and what it connects to, Bob investigates the IBM i application and returns the answer in one workflow."*

The strongest demo moment is Bob independently determining the investigation path — connection check, library scope, object discovery, source resolution, dependency analysis — without the developer knowing which IBM i command to run.
