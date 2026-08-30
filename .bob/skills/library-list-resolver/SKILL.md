---
name: IBM i Library List Resolver
description: Use this skill to resolve the IBM i effective library list and check whether a specific library is in scope. Activate when a developer asks which libraries are available, why an object cannot be found, or wants to verify library scope before searching for an IBM i object.
---

# IBM i Library List Resolver

This skill resolves the effective IBM i library list and validates whether a specific library is in scope. It prevents false "object not found" conclusions caused by missing library scope.

## When to Use

Activate this skill when the developer asks:
- "What libraries are in scope on IBM i?"
- "Show me the library list"
- "Is QGPL in the library list?"
- "Why can't the program be found — is the library missing?"
- "Check the library scope before searching"

## Steps

### Step 1 — Determine Execution Mode

Check whether PUB400 is reachable by calling `check_connection`. If reachable, use LIVE path. If not, use FALLBACK path.

Display mode badge:
- `🟢 LIVE IBM i — pub400.com` — if reachable
- `🟡 LOCAL FALLBACK — demo dataset` — if not reachable

### Step 2A — LIVE Path: Get Library List

Call the MCP tool `get_library_list` (no parameters).

This tool queries `QSYS2.LIBRARY_LIST_INFO` and returns the ordered list of libraries.

Format the result as a Markdown table:

```
| # | Library  | Type | Description |
|---|----------|------|-------------|
| 1 | QSYS     | SYS  | IBM i System Library |
...
```

### Step 2B — FALLBACK Path: Read Local Library List

Read `demo-data/objects/library-list.json`. The `library_list` array contains entries with `library`, `type`, `ordinal`, and `description` fields.

Format the result as the same Markdown table.

### Step 3 — Validate Specific Library (if requested)

If the developer mentioned a specific library name, check whether it appears in the list.

**If found:** Highlight it in the table with a ✅ marker and confirm it is in scope.

**If not found:** Output:
```
⚠️ Library [LIBNAME] is not in the current library list.
To add it, run: ADDLIBLE LIBNAME
After adding, repeat the object search.
```

Do **not** conclude that the object does not exist — a missing library is a scope issue, not proof of absence.

### Step 4 — Report

Present the formatted library list and any scope findings. Stop here unless the developer asks for further investigation.

## IBM i Background

The IBM i library list controls which libraries are searched when an unqualified object name is used. Libraries can be of type:
- **SYS** — IBM-supplied system libraries (QSYS, QSYS2, QUSRSYS)
- **PROD** — Product/application libraries
- **CUR** — Current library (session-specific)
- **USR** — User-added libraries
