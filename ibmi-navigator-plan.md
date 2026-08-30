# IBM i Application Navigator — Bob 2.0 Hackathon Plan

## Top-Level Overview

**Goal:** Build an agentic IBM i Application Navigator as a set of Bob 2.0 skills that accepts
natural-language questions about IBM i programs and investigates the IBM i environment to return
accurate object, source, timestamp, library, and dependency information.

**Scope:**
- 6 Bob 2.0 skill files (SKILL.md) covering the full investigation workflow
- **An MCP server** (`mcp-ibmi-server/`) that wraps all IBM i SSH calls as structured tools, consumed by the live path of every skill
- A local demo dataset (Markdown knowledge base + JSON files) for reliable fallback when PUB400 is unavailable
- A sample IBM i source member that serves as the demo target object (`BALA01.PF`)
- A `.env.example` credential template and `.gitignore` that keeps secrets out of source control
- A `README.md` that explains setup, demo flow, and the hackathon story

**Approach:**
1. Establish project folder structure and credential safety scaffolding first.
2. Build the local fallback dataset (Markdown + JSON) before any live skill, so the demo is always reliable.
3. Build and register the MCP server (`mcp-ibmi-server`) before writing any LIVE-path skill instructions.
4. Implement skills in dependency order: Connection Resolver → Library List Resolver → Object Discovery → Source Locator → Dependency Analyzer → Explanation Orchestrator.
5. The Explanation Orchestrator skill is **self-contained** — it embeds all 6 investigation steps inline. The other 5 skills are standalone deep-dive helpers, not components called by the orchestrator.
6. Validate the end-to-end demo flow against both LIVE and FALLBACK paths.

**Critical Architecture Notes:**
- All skill files MUST live under `.bob/skills/<name>/SKILL.md` — Bob only discovers skills in this location.
- Skills cannot programmatically call other skills. The Explanation Orchestrator contains the full workflow inline.
- MCP server registration MUST use `.bob/mcp.json` with the `mcpServers` JSON schema.
- The `skills/` top-level folder in the directory tree is for source reference only — actual Bob skills go in `.bob/skills/`.

**Non-goals:**
- No web server, no separate front-end application
- No write operations against PUB400 — all IBM i commands are read-only
- No hard-coded passwords, tokens, or private keys anywhere in source
- No fabricated production metrics — time-saved values are illustrative only

---

## Sub-Task 1 — Project Scaffolding and Credential Safety

**Status:** [x] done

**Intent:**
Establish the workspace directory structure, `.gitignore`, `.env.example`, and a root `README.md`
skeleton so that every subsequent sub-task has a safe, organised place to land. This task has no
logic — only structure and safety.

**Expected Outcomes:**
- Directory tree exists with placeholder folders for skills, demo-data, and source members
- `.gitignore` excludes `.env` and any credential files
- `.env.example` documents the required environment variables without real values
- `README.md` skeleton exists with project name, purpose, and TODO markers for later sections

**Todo List:**
1. Create the top-level directory layout:
   ```
   IBMi_project/
   ├── .env.example
   ├── .gitignore
   ├── README.md
   ├── mcp-ibmi-server/            (MCP server — Sub-Task 3a)
   │   ├── package.json
   │   ├── tsconfig.json
   │   └── src/
   │       ├── index.ts
   │       └── ssh-client.ts
   ├── .bob/
   │   ├── mcp.json                (MCP server registration — Sub-Task 3a)
   │   └── skills/                 (ALL Bob skills live here — discovered automatically)
   │       ├── connection-resolver/
   │       │   └── SKILL.md
   │       ├── library-list-resolver/
   │       │   └── SKILL.md
   │       ├── object-discovery/
   │       │   └── SKILL.md
   │       ├── source-locator/
   │       │   └── SKILL.md
   │       ├── dependency-analyzer/
   │       │   └── SKILL.md
   │       └── explanation-orchestrator/
   │           └── SKILL.md
   ├── demo-data/
   │   ├── ibmi-knowledge-base.md
   │   └── objects/                (JSON files land here)
   └── BALA981/
       └── QRPGLESRC/
           └── BALA01.PF           (existing active file)
   ```
2. Write `.gitignore` — exclude `.env`, `*.env`, `node_modules/`, `mcp-ibmi-server/dist/`, and OS artifacts.
   **Do NOT exclude `.bob/` from git** — skill files and `mcp.json` (which contains no secrets) must be committed.
3. Write `.env.example` with placeholders:
   - `IBMI_HOST` — PUB400 hostname (pub400.com)
   - `IBMI_USER` — SSH username
   - `IBMI_SSH_KEY_PATH` — path to private key file (never commit the key itself)
   - `IBMI_PORT` — SSH port (default 22)
4. Write `README.md` skeleton with: project title, hackathon context, setup instructions stub,
   demo flow stub, and a "Time Saved" illustrative metric placeholder.

**Relevant Context:**
- Active file `BALA981/QRPGLESRC/BALA01.PF` already referenced — keep that path intact.
- No existing files in workspace — full creation.

---

## Sub-Task 2 — Local Fallback Demo Dataset

**Status:** [x] done

**Intent:**
Build the local fallback dataset that the skills fall back to when PUB400 is unreachable. This
dataset must represent a realistic IBM i application ecosystem including known-good PUB400-style
objects AND edge-case objects (missing source, multiple library matches) so every demo scenario
can be shown offline.

**Expected Outcomes:**
- `demo-data/ibmi-knowledge-base.md` — human-readable Markdown KB covering all demo objects,
  libraries, source locations, timestamps, dependencies, and edge cases. Bob reasons over this.
- `demo-data/objects/library-list.json` — simulated DSPLIBL output
- `demo-data/objects/object-catalog.json` — simulated DSPOBJD / OBJECT_STATISTICS output
- `demo-data/objects/program-info.json` — simulated DSPPGM output (source file, member, bound modules)
- `demo-data/objects/program-refs.json` — simulated DSPPGMREF output (referenced objects)
- Each JSON follows the same field schema as the corresponding IBM i command output so the live
  and fallback paths share one result model.

**Todo List:**
1. Design the shared result model (field names used by both live and fallback paths):
   - Object record: `library`, `object_name`, `object_type`, `text_description`, `creation_date`,
     `last_change_date`, `source_file`, `source_member`, `source_library`, `object_size`
   - Dependency record: `from_object`, `from_library`, `to_object`, `to_library`, `to_type`, `usage`
   - Library list record: `library`, `type` (SYS / PROD / CUR / USR)
2. Populate objects — include at minimum:
   - `CUSTUPD` in `QGPL` — *PGM, has source in QRPGLESRC, has outbound dependencies
   - `BALA01` in `BALA981` — *FILE (PF), the active source member, no outbound dependencies
   - `ORDHDR` in `QGPL` — *PGM, referenced by CUSTUPD
   - `INVMST` in `QGPL` — *FILE (LF), referenced by CUSTUPD
   - `EDTPGM` in `TESTLIB` — *PGM, edge case: source member missing
   - `RPTGEN` in both `QGPL` and `DEVLIB` — edge case: multiple library matches
3. Write `ibmi-knowledge-base.md` — structured Markdown sections for each object including
   narrative description, all metadata fields, dependencies, and notes on edge cases.
4. Write each JSON file following the field model from step 1.
5. Add a `demo-data/README.md` explaining how to extend the dataset.

**Relevant Context:**
- The Markdown KB is what Bob's skills read when mode is `LOCAL FALLBACK`.
- JSON files support any programmatic or scripted access to the same data.
- Edge cases (missing source, multiple library matches) are explicitly required by the hackathon design doc.

---

## Sub-Task 3 — Skill 1: Connection Resolver (Standalone Deep-Dive)

**Status:** [x] done

**Intent:**
A standalone skill a developer can invoke when they specifically want to test or diagnose IBM i
connectivity. It checks whether PUB400 is reachable via the MCP server's `check_connection` tool
and reports the execution mode clearly. The Explanation Orchestrator (Sub-Task 8) duplicates this
logic inline — this skill exists as a focused single-purpose helper.

**Expected Outcomes:**
- `.bob/skills/connection-resolver/SKILL.md` exists and Bob auto-discovers it
- Skill instructs Bob to call the `check_connection` MCP tool
- If reachable: reports `🟢 LIVE IBM i — pub400.com` with connection details
- If unreachable: reports `🟡 LOCAL FALLBACK — demo dataset active` and explains why
- Skill never stores or logs credentials — all credential access is inside the MCP server

**Todo List:**
1. Write `.bob/skills/connection-resolver/SKILL.md` with:
   - Frontmatter: `name: IBM i Connection Resolver`, `description` (used by Bob to decide activation — write a clear sentence describing when to use this skill, e.g. "Use this skill to check whether the IBM i PUB400 server is reachable and determine if live or fallback mode should be used")
   - Instructions section below `---` delimiter:
     - Step 1: Call MCP tool `check_connection` (no parameters)
     - Step 2: If result is `reachable: true` → display `🟢 LIVE IBM i — pub400.com`
     - Step 3: If result is `reachable: false` → display `🟡 LOCAL FALLBACK — demo dataset` and note the reason
   - Security note: credentials live in the MCP server process only — never echo them

**Relevant Context:**
- Bob only loads this skill when the `description` matches the user's request — write the description carefully.
- Skill file MUST be at `.bob/skills/connection-resolver/SKILL.md` to be discovered by Bob.
- The MCP tool `check_connection` is registered in Sub-Task 3a.

---

## Sub-Task 3a — MCP Server: IBM i SSH Tool Wrapper

**Status:** [x] done

**Intent:**
Build a custom MCP server (`mcp-ibmi-server`) that wraps every IBM i SSH interaction as a
structured, type-safe MCP tool. All six skills use this server on the LIVE path instead of
constructing raw SSH commands themselves. This centralises credential handling, SSH session
management, error normalisation, and output parsing in one place — keeping skills clean and
the demo reliable.

**Expected Outcomes:**
- `mcp-ibmi-server/` is a self-contained Node.js / TypeScript MCP server project
- Server registers the following MCP tools:
  | Tool name | IBM i operation | Primary method |
  |---|---|---|
  | `check_connection` | TCP reachability probe | SSH port connect, no auth |
  | `get_library_list` | Resolve library list | `QSYS2.LIBRARY_LIST_INFO` SQL |
  | `discover_object` | Find object by name | `QSYS2.OBJECT_STATISTICS` SQL |
  | `get_program_info` | Source file/member/compiler | `QSYS2.PROGRAM_INFO` SQL |
  | `get_program_refs` | Outbound dependencies | `DSPPGMREF` or `QSYS2` |
  | `execute_ibmi_command` | Generic CL/SQL passthrough | Raw SSH command execution |
- All tools read `IBMI_HOST`, `IBMI_USER`, `IBMI_SSH_KEY_PATH`, `IBMI_PORT` from environment — no credential parameters in tool schemas
- All tools return structured JSON (not raw spooled text) using the shared result model from Sub-Task 2
- Server is registered in Bob's MCP config so skills can call it via `mcp__ibmi__<tool_name>`
- `execute_ibmi_command` accepts a `command` string and returns `{ stdout, stderr, exit_code }`
- Server handles SSH connection errors gracefully and returns a typed error response rather than throwing

**Todo List:**
1. Scaffold the MCP server project in `mcp-ibmi-server/`:
   - `package.json` with `@modelcontextprotocol/sdk`, `ssh2`, `typescript` dependencies
   - `tsconfig.json` targeting Node 18+
   - `src/index.ts` as the server entry point
2. Implement SSH session helper in `src/ssh-client.ts`:
   - Opens an SSH connection using key-based auth from env vars
   - Exposes `runSql(sql: string)` and `runCommand(cmd: string)` helpers
   - Handles connection timeout (5 s) and returns typed errors
3. Register all 6 tools using the MCP SDK `registerTool` API:
   - `check_connection` — TCP probe only, no full SSH auth needed
   - `get_library_list` — runs `SELECT * FROM QSYS2.LIBRARY_LIST_INFO ORDER BY ORDINAL_POSITION`
   - `discover_object(object_name, object_type?)` — runs `QSYS2.OBJECT_STATISTICS` query
   - `get_program_info(program_name, program_library)` — runs `QSYS2.PROGRAM_INFO` query
   - `get_program_refs(program_name, program_library)` — runs `DSPPGMREF` via SSH or SQL equivalent
   - `execute_ibmi_command(command)` — generic passthrough with stdout/stderr/exit_code response
4. Map each tool's raw IBM i output to the shared result model field names from Sub-Task 2
5. Create `.bob/mcp.json` with the correct `mcpServers` registration schema:
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
   - Server name `"ibmi"` means Bob calls tools as `mcp__ibmi__check_connection`, `mcp__ibmi__discover_object`, etc.
   - The `env` block is intentionally empty — `IBMI_HOST`, `IBMI_USER`, `IBMI_SSH_KEY_PATH`, `IBMI_PORT` are read from the shell environment (set via `.env` loaded by the developer before starting Bob)
   - `.bob/mcp.json` is committed to source control — it contains no secrets
6. Add `mcp-ibmi-server/dist/` and `mcp-ibmi-server/node_modules/` to `.gitignore`
7. Document the server in `mcp-ibmi-server/README.md`: tool list, env vars, build instructions (`npm run build`), and how to load `.env` before starting Bob

**Relevant Context:**
- Skills 3–8 all use this server on the LIVE path — build it before any skill that needs live IBM i data.
- The `execute_ibmi_command` generic tool gives the Explanation Orchestrator an escape hatch for any command not covered by specific tools.
- Credentials must never appear in tool schemas, MCP config, or logs — environment variables only.
- See Sub-Task 2 for the shared result model field names that tool responses must match.

---

## Sub-Task 4 — Skill 2: Library List Resolver (Standalone Deep-Dive)

**Status:** [x] done

**Intent:**
A standalone skill a developer can invoke when they want to see which IBM i libraries are currently
in scope. On the LIVE path it calls the MCP `get_library_list` tool; on FALLBACK it reads the
local JSON file. The Explanation Orchestrator duplicates this logic inline.

**Expected Outcomes:**
- `.bob/skills/library-list-resolver/SKILL.md` exists and is auto-discovered by Bob
- LIVE path: calls MCP tool `get_library_list` → returns ordered library list with types
- FALLBACK path: reads `demo-data/objects/library-list.json` and formats output
- If the target library is absent, reports the gap with `ADDLIBLE` suggestion
- Output: formatted Markdown table of libraries

**Todo List:**
1. Write `.bob/skills/library-list-resolver/SKILL.md` with:
   - Frontmatter: `name: IBM i Library List Resolver`, `description` — clear activation sentence (e.g. "Use this skill to resolve the IBM i library list and check whether a specific library is in scope")
   - Instructions below `---`:
     - Step 1: Determine execution mode (call `check_connection` MCP tool or check prior context)
     - Step 2 LIVE: call `mcp__ibmi__get_library_list`, format result as Markdown table
     - Step 2 FALLBACK: read `demo-data/objects/library-list.json`, format as Markdown table
     - Step 3: If a specific library was requested, highlight whether it appears in the list
     - Step 4: If absent, output "Library X is not in scope. Add it with ADDLIBLE X"

**Relevant Context:**
- Skill file MUST be at `.bob/skills/library-list-resolver/SKILL.md`.
- QSYS2.LIBRARY_LIST_INFO is the MCP server's preferred method — already handled inside the tool.

---

## Sub-Task 5 — Skill 3: Object Discovery (Standalone Deep-Dive)

**Status:** [x] done

**Intent:**
A standalone skill for locating a specific IBM i object by name. On LIVE it calls
`mcp__ibmi__discover_object`; on FALLBACK it searches the local object catalog JSON.
Handles single match, multiple matches, and not-found cases. The Explanation Orchestrator
duplicates this logic inline.

**Expected Outcomes:**
- `.bob/skills/object-discovery/SKILL.md` exists and is auto-discovered by Bob
- LIVE: calls `mcp__ibmi__discover_object(object_name, object_type?)` → structured object record
- FALLBACK: searches `demo-data/objects/object-catalog.json` by `object_name`
- Single match → full object record card
- Multiple matches → candidate table, asks user to select library
- No match → "not found" message referencing library list scope

**Todo List:**
1. Write `.bob/skills/object-discovery/SKILL.md` with:
   - Frontmatter: `name: IBM i Object Discovery`, `description` — clear activation sentence
   - Instructions below `---`:
     - Step 1: Determine execution mode
     - Step 2 LIVE: call `mcp__ibmi__discover_object` with object name from user request
     - Step 2 FALLBACK: search `demo-data/objects/object-catalog.json` by `object_name`
     - Step 3: Single result → render object record card
     - Step 3: Multiple results → render candidate table, ask "Which library? (e.g. QGPL or DEVLIB)"
     - Step 3: No results → "Object not found in current library scope. Check library list with ADDLIBLE."

**Relevant Context:**
- Skill file MUST be at `.bob/skills/object-discovery/SKILL.md`.
- `RPTGEN` in both QGPL and DEVLIB is the multiple-match edge case in the dataset.

---

## Sub-Task 6 — Skill 4: Source Locator (Standalone Deep-Dive)

**Status:** [x] done

**Intent:**
A standalone skill for finding where a program's source code lives. On LIVE it calls
`mcp__ibmi__get_program_info`; on FALLBACK it reads `program-info.json`. Handles missing-source
gracefully. The Explanation Orchestrator duplicates this logic inline.

**Expected Outcomes:**
- `.bob/skills/source-locator/SKILL.md` exists and is auto-discovered by Bob
- LIVE: calls `mcp__ibmi__get_program_info(program_name, program_library)` → source location record
- FALLBACK: reads `demo-data/objects/program-info.json` filtered by object name
- Returns: source file, source library, source member, compiler, bound service programs
- Missing source (`EDTPGM`): renders "Source member not available — compiled without debug data or source deleted"

**Todo List:**
1. Write `.bob/skills/source-locator/SKILL.md` with:
   - Frontmatter: `name: IBM i Source Locator`, `description` — clear activation sentence
   - Instructions below `---`:
     - Step 1: Determine execution mode
     - Step 2 LIVE: call `mcp__ibmi__get_program_info` with program name and library
     - Step 2 FALLBACK: read `demo-data/objects/program-info.json`, filter by object name
     - Step 3: Render source location card — file, library, member, compiler
     - Step 3: If `source_member` is null/empty → render "Source member not available" message with common explanations

**Relevant Context:**
- Skill file MUST be at `.bob/skills/source-locator/SKILL.md`.
- `EDTPGM` in `TESTLIB` is the missing-source edge case — `source_member: null` in the JSON.

---

## Sub-Task 7 — Skill 5: Dependency Analyzer (Standalone Deep-Dive)

**Status:** [x] done

**Intent:**
A standalone skill for investigating what objects a program references (outbound) and what
references it (inbound where supported). On LIVE it calls `mcp__ibmi__get_program_refs`; on
FALLBACK it reads `program-refs.json`. The Explanation Orchestrator duplicates this logic inline.

**Expected Outcomes:**
- `.bob/skills/dependency-analyzer/SKILL.md` exists and is auto-discovered by Bob
- LIVE: calls `mcp__ibmi__get_program_refs(program_name, program_library)` → dependency records
- FALLBACK: reads `demo-data/objects/program-refs.json`, filters by `from_object`
- Outbound: table of referenced objects with name, library, type, usage
- Inbound: attempted — if not available, states "Inbound reference analysis not available in this environment"

**Todo List:**
1. Write `.bob/skills/dependency-analyzer/SKILL.md` with:
   - Frontmatter: `name: IBM i Dependency Analyzer`, `description` — clear activation sentence
   - Instructions below `---`:
     - Step 1: Determine execution mode
     - Step 2 LIVE: call `mcp__ibmi__get_program_refs` with program name and library
     - Step 2 FALLBACK: read `demo-data/objects/program-refs.json`, filter by `from_object`
     - Step 3: Render outbound dependency table — columns: Object, Library, Type, Usage
     - Step 4: Attempt inbound — if data unavailable, render honest "not available" note

**Relevant Context:**
- Skill file MUST be at `.bob/skills/dependency-analyzer/SKILL.md`.
- `DSPPGMREF` is the IBM i canonical command — the MCP server wraps it.

---

## Sub-Task 8 — Skill 6: Explanation Orchestrator (Primary Demo Skill)

**Status:** [x] done

**Intent:**
The primary skill activated by any IBM i navigator request. Because Bob cannot chain skill
activations, this skill is **fully self-contained**: it embeds all 6 investigation steps inline
within its own instructions. It calls MCP tools directly (LIVE path) or reads the local dataset
(FALLBACK path) and assembles the complete result card plus investigation trace in a single
Bob response. This is the "wow moment" of the hackathon demo.

**Expected Outcomes:**
- `.bob/skills/explanation-orchestrator/SKILL.md` exists and Bob auto-discovers it
- `description` is broad enough to match any navigator-type request (e.g. "find program X",
  "where is CUSTUPD", "investigate IBM i object", "show me source for...")
- Skill is fully self-contained — it does NOT reference or activate other skill files
- Bob follows the inline 6-step investigation sequence on every activation:
  1. Connection check → sets LIVE or FALLBACK mode
  2. Library list resolution → validates scope
  3. Object discovery → finds the exact object (handles multiple matches)
  4. Source location → finds source file/member (handles missing source)
  5. Dependency analysis → lists referenced objects
  6. Final answer → assembles result card + investigation trace
- Final output always includes all required sections (see below)

**Todo List:**
1. Write `.bob/skills/explanation-orchestrator/SKILL.md` with:
   - Frontmatter:
     - `name: IBM i Application Navigator`
     - `description`: broad activation sentence — e.g. "Use this skill whenever a developer asks to find, investigate, locate, or analyse an IBM i program, object, or source member. This skill runs the complete agentic investigation workflow."
   - Instructions section below `---` delimiter containing ALL 6 steps inline:
     - **Step 1 — Connection Check:**
       Call `mcp__ibmi__check_connection`. If `reachable: true` → mode = LIVE. If false or error → mode = FALLBACK. Display mode badge: `🟢 LIVE IBM i — pub400.com` or `🟡 LOCAL FALLBACK — demo dataset`.
     - **Step 2 — Library List:**
       LIVE: call `mcp__ibmi__get_library_list`. FALLBACK: read `demo-data/objects/library-list.json`. Render library table. If requested object's library is absent → stop and output "Library not in scope" message with ADDLIBLE suggestion.
     - **Step 3 — Object Discovery:**
       LIVE: call `mcp__ibmi__discover_object(object_name)`. FALLBACK: search `demo-data/objects/object-catalog.json`. Single result → continue. Multiple results → render candidate table and ask for library selection. No result → stop with not-found message.
     - **Step 4 — Source Location:**
       LIVE: call `mcp__ibmi__get_program_info(program_name, library)`. FALLBACK: read `demo-data/objects/program-info.json`. Render source location card. If source missing → render "Source member not available" with explanation.
     - **Step 5 — Dependency Analysis:**
       LIVE: call `mcp__ibmi__get_program_refs(program_name, library)`. FALLBACK: read `demo-data/objects/program-refs.json`. Render outbound dependency table.
     - **Step 6 — Final Answer:**
       Assemble and render the complete result using the template below.
   - Result card output template (Markdown):
     ```
     ## IBM i Investigation Result
     **Mode:** 🟢 LIVE IBM i / 🟡 LOCAL FALLBACK

     ### Object
     | Field | Value |
     |---|---|
     | Name | ... |
     | Library | ... |
     | Type | ... |
     | Description | ... |
     | Created | ... |
     | Last Changed | ... |

     ### Source Location
     | Field | Value |
     |---|---|
     | Source File | ... |
     | Source Library | ... |
     | Source Member | ... |
     | Compiler | ... |

     ### Dependencies
     | Object | Library | Type | Usage |
     |---|---|---|---|
     | ... | ... | ... | ... |

     ### Investigation Trace
     1. Checked connection → [LIVE/FALLBACK]
     2. Resolved library list → [N libraries in scope]
     3. Discovered object → [name/library/type]
     4. Located source → [file/member or not available]
     5. Analysed dependencies → [N references found]

     ---
     ⏱️ *Estimated manual investigation: ~15 min | Bob: ~30 sec — illustrative values*
     ```
   - Distinguish confirmed facts (from live IBM i or JSON data) vs unavailable information
     using labels: `✅ Confirmed` / `⚠️ Not available`

**Relevant Context:**
- This skill MUST be at `.bob/skills/explanation-orchestrator/SKILL.md`.
- Self-contained design is mandatory — skills cannot call other skills in Bob 2.0.
- The `description` frontmatter field is what Bob uses to decide activation — write it broadly.
- All MCP tool calls use the naming pattern `mcp__ibmi__<tool_name>` matching the `"ibmi"` server name in `.bob/mcp.json`.

---

## Sub-Task 9 — Sample IBM i Source Member and README Completion

**Status:** [x] done

**Intent:**
Provide a realistic sample IBM i source member (`BALA01.PF`) as a DDS Physical File definition
so the workspace has tangible IBM i artefacts that map to the demo dataset. Complete the root
`README.md` with full setup, demo flow, and credential instructions.

**Expected Outcomes:**
- `BALA981/QRPGLESRC/BALA01.PF` contains a valid DDS Physical File definition that can be
  compiled on IBM i — this is the demo's "real artefact" moment
- `README.md` is complete: project purpose, folder map, credential setup steps, demo flow
  walkthrough (8 steps from the hackathon doc), and the illustrative time-saved metric

**Todo List:**
1. Write `BALA981/QRPGLESRC/BALA01.PF` as a DDS PF source member with at least 3–5 fields
   (e.g. a customer balance file) consistent with the `CUSTUPD` program in the demo dataset.
2. Complete `README.md`:
   - Project overview paragraph
   - Prerequisites (Bob 2.0, SSH client, PUB400 account)
   - Credential setup: copy `.env.example` → `.env`, fill in values
   - Demo flow: 8 steps from the hackathon design doc
   - Folder structure table
   - Illustrative time-saved metric with disclaimer
   - Security note: never commit `.env` or SSH keys

**Relevant Context:**
- The active file reference `\BALA981\QRPGLESRC\BALA01.PF` suggests this path is expected.
- DDS PF syntax is fixed-column RPG-era format — use standard column positions.

---

## Sub-Task 10 — End-to-End Demo Validation

**Status:** [x] done

**Intent:**
Verify the complete demo story works end-to-end in both LIVE and FALLBACK modes by walking
through the hackathon's 8-step demo script. Confirm every skill file is syntactically valid
for Bob, every JSON dataset loads correctly, and all edge cases produce expected output.

**Expected Outcomes:**
- All 6 `SKILL.md` files pass Bob skill validation (correct frontmatter, triggers, instructions)
- MCP server builds cleanly (`npm run build`) and all 6 tools are registered
- MCP server is reachable from Bob via `mcp__ibmi__check_connection`
- FALLBACK mode demo: `CUSTUPD` request returns full result card from local dataset
- FALLBACK edge case 1: `EDTPGM` request shows "source not available" gracefully
- FALLBACK edge case 2: `RPTGEN` request shows multiple-library clarification table
- LIVE mode validation: if PUB400 is accessible, `mcp__ibmi__discover_object` returns a real object record
- `README.md` demo flow steps 1–8 are each verifiable from the skill output

**Todo List:**
1. Review all 6 `SKILL.md` files for frontmatter completeness and correct trigger keywords.
2. Confirm MCP server `package.json` has correct build script and all dependencies.
3. Confirm MCP server is registered in Bob MCP config with no hardcoded secrets.
4. Trace the `CUSTUPD` request manually through the orchestrator logic on the fallback dataset —
   confirm all five output sections render correctly.
5. Trace `EDTPGM` — confirm missing-source path produces a clean message, not an error.
6. Trace `RPTGEN` — confirm multiple-library path surfaces both matches as a table.
7. Confirm `.gitignore` excludes `.env`, `dist/`, and `node_modules/`.
8. Confirm `.env.example` has no real credentials.
9. Update this plan file — set all sub-task statuses to `[x] done` as each is completed.

**Relevant Context:**
- The hackathon demo story is the primary success criterion — the 8 demo steps must all work.
- Security validation (no committed secrets) is a hard requirement from the hackathon design doc.

---

## Dependency Order Summary

```
Sub-Task 1 (Scaffolding — folders, .gitignore, .env.example, .bob/ tree)
    └─ Sub-Task 2 (Demo Dataset — ibmi-knowledge-base.md + 4 JSON files)
        ├─ Sub-Task 3a (MCP Server — mcp-ibmi-server/ + .bob/mcp.json)
        │   ├─ Sub-Task 3  (Skill 1: Connection Resolver — .bob/skills/connection-resolver/SKILL.md)
        │   ├─ Sub-Task 4  (Skill 2: Library List Resolver — .bob/skills/library-list-resolver/SKILL.md)
        │   ├─ Sub-Task 5  (Skill 3: Object Discovery — .bob/skills/object-discovery/SKILL.md)
        │   ├─ Sub-Task 6  (Skill 4: Source Locator — .bob/skills/source-locator/SKILL.md)
        │   ├─ Sub-Task 7  (Skill 5: Dependency Analyzer — .bob/skills/dependency-analyzer/SKILL.md)
        │   └─ Sub-Task 8  (Skill 6: Explanation Orchestrator — .bob/skills/explanation-orchestrator/SKILL.md)
        └─ Sub-Task 9 (Source Member BALA01.PF + completed README.md)
Sub-Task 10 (Validation — runs last, depends on all above)
```

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Credential storage | `.env` file, git-excluded | Security requirement from hackathon doc |
| Live IBM i target | PUB400 (pub400.com) | Free public IBM i, accessible via SSH |
| MCP server | Custom `mcp-ibmi-server` in TypeScript | Centralises SSH, credential handling, output parsing |
| MCP tools | 5 specific + 1 generic `execute_ibmi_command` | Specific tools for structured output; generic for flexibility |
| MCP config location | `.bob/mcp.json` — committed to source control | No secrets in file; required location for Bob discovery |
| **Skill file location** | **`.bob/skills/<name>/SKILL.md`** | **Bob only auto-discovers skills here — not `skills/` at root** |
| **Orchestrator design** | **Self-contained — all 6 steps inline** | **Bob cannot chain skill activations; one skill = one context load** |
| Skills 1–5 role | Standalone deep-dive helpers | Individually activatable for focused investigation tasks |
| Fallback dataset format | Markdown KB + JSON | Bob reasons over MD; JSON for programmatic use |
| IBM i method preference | QSYS2 SQL first, commands second | Structured output, easier parsing |
| Time-saved metric | Static illustrative label | No fabricated metrics — clearly labelled |
| Source member format | DDS Physical File (fixed-column) | Matches IBM i QRPGLESRC convention |
