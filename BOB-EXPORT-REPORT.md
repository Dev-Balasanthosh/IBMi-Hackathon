# IBM i Application Navigator — Bob 2.0 Export Report

**Project:** IBM i Application Navigator  
**Event:** IBM TechXchange 2026 — Pre-Conference Dev Day Hackathon  
**Bob Version:** Bob 2.0  
**Export Date:** 2025  
**Repository:** https://github.com/Balasanthosh-dev/IBMi_Hackathon

---

## Bob Usage Summary

This project uses Bob 2.0 as the **core agentic runtime** for an IBM i application navigator. Bob is not used as a simple chat interface — it is used as an agentic reasoning engine that executes a structured multi-step investigation workflow, calls external IBM i tools via MCP, handles conditional branching, and assembles structured results from multiple data sources.

---

## Bob Skills Registered

All skills are located in `.bob/skills/` and are auto-discovered by Bob.

### Skill 1 — IBM i Application Navigator ⭐ (Primary)
**File:** `.bob/skills/explanation-orchestrator/SKILL.md`  
**Role:** Primary demo skill. Fully self-contained 6-step agentic workflow.  
**Bob behaviour:**
- Activates on any IBM i navigation request ("find program X", "where is CUSTUPD", "investigate IBM i object")
- Step 1: Calls `mcp__ibmi__check_connection` → determines LIVE or FALLBACK mode
- Step 2: Calls `mcp__ibmi__get_library_list` → resolves scope, halts if library missing
- Step 3: Calls `mcp__ibmi__discover_object` → handles single match, multiple matches (clarification), not found
- Step 4: Calls `mcp__ibmi__get_program_info` → resolves source file/member, handles missing source
- Step 5: Calls `mcp__ibmi__get_program_refs` → analyses outbound + inbound dependencies
- Step 6: Assembles full result card + investigation trace + illustrative time metric

### Skill 2 — IBM i Connection Resolver
**File:** `.bob/skills/connection-resolver/SKILL.md`  
**Role:** Standalone connectivity diagnostic skill.  
**Bob behaviour:** Calls `check_connection` MCP tool, reports 🟢 LIVE or 🟡 FALLBACK mode.

### Skill 3 — IBM i Library List Resolver
**File:** `.bob/skills/library-list-resolver/SKILL.md`  
**Role:** Standalone library scope investigation skill.  
**Bob behaviour:** Calls `get_library_list`, formats result, validates target library presence, suggests `ADDLIBLE` if missing.

### Skill 4 — IBM i Object Discovery
**File:** `.bob/skills/object-discovery/SKILL.md`  
**Role:** Standalone object finder skill.  
**Bob behaviour:** Calls `discover_object`, handles single/multiple/zero results, surfaces clarification table for multi-library matches.

### Skill 5 — IBM i Source Locator
**File:** `.bob/skills/source-locator/SKILL.md`  
**Role:** Standalone source member finder skill.  
**Bob behaviour:** Calls `get_program_info`, renders source location card, explains missing source with IBM i context.

### Skill 6 — IBM i Dependency Analyzer
**File:** `.bob/skills/dependency-analyzer/SKILL.md`  
**Role:** Standalone dependency investigation skill.  
**Bob behaviour:** Calls `get_program_refs`, renders outbound and inbound dependency tables, notes when inbound analysis is unavailable.

---

## MCP Server Registration

**File:** `.bob/mcp.json`

```json
{
  "mcpServers": {
    "ibmi": {
      "command": "node",
      "args": ["mcp-ibmi-server/dist/index.js"],
      "transport": "stdio",
      "env": {}
    }
  }
}
```

Bob calls all tools as `mcp__ibmi__<tool_name>` matching the server name `"ibmi"`.

---

## MCP Tools Exposed to Bob

All tools are implemented in `mcp-ibmi-server/src/index.ts` (TypeScript/Node.js).

| Tool Name | Called by Bob as | IBM i Operation | Method |
|---|---|---|---|
| `check_connection` | `mcp__ibmi__check_connection` | TCP reachability probe | `net.Socket` port 2222 |
| `get_library_list` | `mcp__ibmi__get_library_list` | Effective library list | `QSYS2.LIBRARY_LIST_INFO` SQL |
| `discover_object` | `mcp__ibmi__discover_object` | Object discovery | `QSYS2.OBJECT_STATISTICS` SQL |
| `get_program_info` | `mcp__ibmi__get_program_info` | Source file/member/compiler | `QSYS2.PROGRAM_INFO` SQL |
| `get_program_refs` | `mcp__ibmi__get_program_refs` | Outbound dependencies | `QSYS2.PROGRAM_OBJECT_INFO` / `DSPPGMREF` |
| `search_source` | `mcp__ibmi__search_source` | Source member search | `QSYS2.SYSPARTITIONSTAT` SQL |
| `execute_ibmi_command` | `mcp__ibmi__execute_ibmi_command` | Generic CL/SQL passthrough | Raw SSH via `system` utility |

---

## Dual-Path Architecture

Bob's skills implement two execution paths controlled by the `check_connection` result:

### LIVE Path (🟢 pub400.com reachable)
1. MCP server opens SSH session to `pub400.com:2222` using key from `IBMI_SSH_KEY_PATH`
2. Runs QSYS2 SQL queries via PASE `db2` CLI
3. Falls back to `system` CL commands for non-SQL operations
4. Returns structured JSON matching the shared result model

### FALLBACK Path (🟡 pub400.com not reachable)
1. Bob reads `demo-data/objects/library-list.json`
2. Bob reads `demo-data/objects/object-catalog.json`
3. Bob reads `demo-data/objects/program-info.json`
4. Bob reads `demo-data/objects/program-refs.json`
5. Bob reasons over `demo-data/ibmi-knowledge-base.md` for context
6. Output format identical to LIVE path

---

## Demo Scenarios Supported

| Scenario | Object | Expected Bob Behaviour |
|---|---|---|
| Happy path | `CUSTUPD` | Full 5-step investigation, 5 outbound deps |
| Missing source | `EDTPGM` | Graceful "source not available" message |
| Multiple library match | `RPTGEN` | Candidate table, asks for library selection |
| CL program | `CUSTCL` | Source in QCLSRC, inbound callers shown |
| Service program | `BALASRV` | `*SRVPGM` type, bound modules listed |
| Display file | `CUSTDSPF` | `*FILE DSPF`, DDS source path |
| Not found | `XXXXXXX` | Scope explanation + available objects listed |

---

## Security

- Credentials are loaded from `.env` (git-excluded) into process environment variables
- No credentials in any SKILL.md, `mcp.json`, or TypeScript source
- All IBM i operations are **read-only** — no objects created, changed, or deleted
- `.env` and SSH private key files are excluded by `.gitignore`

---

## IBM i Environment

- **Host:** pub400.com (free public IBM i)
- **Port:** 2222 (SSH)
- **OS:** IBM i 7.5 (V7R5M0)
- **User profile:** BALA98
- **Authentication:** RSA key-based (`id_rsa`)

---

## File Structure

```
IBMi_Hackathon/
├── .env.example                    # Credential template
├── .gitignore                      # Excludes .env, dist/, node_modules/
├── README.md                       # Setup and demo guide
├── ibmi-navigator-plan.md          # Full project plan (11 sub-tasks)
├── BOB-EXPORT-REPORT.md            # This file
├── .bob/
│   ├── mcp.json                    # MCP server registration
│   └── skills/
│       ├── explanation-orchestrator/SKILL.md   ← Primary demo skill
│       ├── connection-resolver/SKILL.md
│       ├── library-list-resolver/SKILL.md
│       ├── object-discovery/SKILL.md
│       ├── source-locator/SKILL.md
│       └── dependency-analyzer/SKILL.md
├── mcp-ibmi-server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # 7 MCP tools registered
│       └── ssh-client.ts          # SSH helpers: checkConnection, runCommand, runSql, runCL
├── demo-data/
│   ├── ibmi-knowledge-base.md      # Markdown KB for FALLBACK reasoning
│   └── objects/
│       ├── library-list.json       # 8 libraries
│       ├── object-catalog.json     # 11 IBM i objects
│       ├── program-info.json       # 8 program records
│       └── program-refs.json       # 13 dependency references
├── BALA981/
│   └── QRPGLESRC/
│       └── BALA01.PF               # DDS Physical File source member
└── docs/
    ├── hackathon-demo-interactive.html  # Interactive demo (open in browser)
    ├── hackathon-demo-onepager.html     # Static one-pager
    ├── pub400-setup-guide.md            # PUB400 SSH setup guide
    └── ibmi-commands-reference.md       # IBM i commands quick reference
```

---

## How to Run

### Prerequisites
- Node.js 18+
- Bob 2.0
- PUB400 account with SSH key registered

### Setup
```bash
# 1. Clone repository
git clone https://github.com/Balasanthosh-dev/IBMi_Hackathon.git
cd IBMi_Hackathon

# 2. Build MCP server
cd mcp-ibmi-server
npm install
npm run build
cd ..

# 3. Configure credentials
cp .env.example .env
# Edit .env: set IBMI_USER, IBMI_SSH_KEY_PATH, IBMI_PORT=2222

# 4. Load credentials (PowerShell)
Get-Content .env | Where-Object { $_ -notmatch '^#' -and $_ -ne '' } |
  ForEach-Object { $k,$v = $_ -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v,'Process') }

# 5. Open project in Bob — skills and MCP server auto-discovered
```

### Demo Request
In Bob, type:
> **"Find program CUSTUPD. Where is its source, when was it last updated, and what objects are related to it?"**

Bob will run the full 6-step agentic investigation and return a structured result card.

---

*Generated for IBM TechXchange 2026 Pre-Conference Dev Day Hackathon submission.*  
*⚠️ Demo timings (~15 min manual / ~30 sec Bob) are illustrative values, not measured production metrics.*
