---
name: IBM i Object Discovery
description: Use this skill to find and locate a specific IBM i object by name. Activate when a developer asks where a program, file, or other IBM i object is, which library it lives in, when it was created or last changed, or wants to confirm an object exists before looking at its source or dependencies.
---

# IBM i Object Discovery

This skill locates a specific IBM i object by name and returns its full metadata record. It handles single matches, multiple library matches, and not-found cases explicitly.

## When to Use

Activate this skill when the developer asks:
- "Where is program CUSTUPD?"
- "Find object BALA01"
- "Which library is INVMST in?"
- "Does RPTGEN exist on IBM i?"
- "Show me the metadata for ORDHDR"

## Steps

### Step 1 — Determine Execution Mode

Call `check_connection`. If reachable → LIVE. If not → FALLBACK.

Display mode badge.

### Step 2A — LIVE Path: Query QSYS2.OBJECT_STATISTICS

Call the MCP tool `discover_object` with:
- `object_name`: the object name extracted from the developer's request (uppercase, max 10 chars)
- `object_type`: optional — include if the developer specified a type (e.g. `*PGM`, `*FILE`)

This queries `QSYS2.OBJECT_STATISTICS` across all libraries. It returns all matching objects.

### Step 2B — FALLBACK Path: Search Object Catalog

Read `demo-data/objects/object-catalog.json`. Search the `objects` array for entries where `object_name` matches the requested name (case-insensitive). Collect all matches.

### Step 3 — Evaluate Results

**Single match found:**
Proceed to Step 4.

**Multiple matches found (same name, different libraries):**

Render a candidate table:
```
⚠️ Multiple objects found with the name [NAME]. Please specify which library:

| Library | Type | Description | Last Changed |
|---------|------|-------------|--------------|
| QGPL    | *PGM | Production version | 2024-07-19 |
| DEVLIB  | *PGM | Development version | 2024-12-15 |

Which library did you mean?
```
Stop here and wait for the developer to select a library before continuing.

**No match found:**

Output:
```
❌ Object [NAME] was not found in the current library scope.

Libraries searched: [list from library list]

Possible reasons:
1. The object exists in a library not currently in scope — use ADDLIBLE to add it
2. The object name may be spelled differently
3. The object may not exist on this system
```

### Step 4 — Render Object Record Card

Present the matched object as a structured card:

```markdown
### Object Found: ✅ Confirmed

| Field | Value |
|---|---|
| Name | CUSTUPD |
| Library | QGPL |
| Type | *PGM |
| Attribute | RPGLE |
| Description | Customer record update program |
| Created | 2022-03-15 |
| Last Changed | 2024-11-08 |
| Size | 49,152 bytes |
```

Use `✅ Confirmed` for values retrieved from IBM i or the local dataset.
Use `⚠️ Not available` for any field that is null or missing.

## IBM i Background

IBM i object discovery uses `QSYS2.OBJECT_STATISTICS` which is the structured SQL alternative to the `DSPOBJD` command. It searches across libraries and returns metadata including creation and last-change timestamps, object type, and text description.
