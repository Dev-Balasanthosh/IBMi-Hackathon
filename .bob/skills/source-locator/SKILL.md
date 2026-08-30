---
name: IBM i Source Locator
description: Use this skill to find the source code location for an IBM i program or object. Activate when a developer asks where the source is, which source member contains a program, what source physical file to look in, or why source is not available for a program.
---

# IBM i Source Locator

This skill determines where the source code for a discovered IBM i program lives — which source physical file, source library, and source member. It handles the missing-source case gracefully with an explanation.

## When to Use

Activate this skill when the developer asks:
- "Where is the source for CUSTUPD?"
- "Which source member is ORDHDR compiled from?"
- "What source file is in QGPL for this program?"
- "Why is there no source for EDTPGM?"
- "Show me the source location for this program"

## Steps

### Step 1 — Determine Execution Mode

Call `check_connection`. LIVE if reachable, FALLBACK if not. Display mode badge.

### Step 2 — Confirm the Object

Ensure an object name and library have been identified (either from a prior Object Discovery step or from the developer's request). If not known, ask: "Which program and library? (e.g. CUSTUPD in QGPL)"

### Step 3A — LIVE Path: Query QSYS2.PROGRAM_INFO

Call the MCP tool `get_program_info` with:
- `program_name`: the program name (uppercase)
- `program_library`: the library containing the program

This queries `QSYS2.PROGRAM_INFO` and returns source file, source library, source member, compiler, and target release.

### Step 3B — FALLBACK Path: Read Program Info

Read `demo-data/objects/program-info.json`. Find the entry in the `programs` array where `program_name` and `program_library` match (case-insensitive).

### Step 4 — Evaluate Source Availability

**Source is available** (`source_member` is not null/empty):

Render the source location card:
```markdown
### Source Location: ✅ Confirmed

| Field | Value |
|---|---|
| Source File | QRPGLESRC |
| Source Library | QGPL |
| Source Member | CUSTUPD |
| Compiler | CRTBNDRPG |
| Target Release | V7R4M0 |
| Debug Data | Yes |
```

**Source is NOT available** (`source_member` is null/empty or `debug_data` is false):

Render:
```markdown
### Source Location: ⚠️ Not Available

The source member for this program is not recorded in the program object.

**Common reasons:**
1. Compiled with `DBGVIEW(*NONE)` or `OPTIMIZE(*FULL)` — source reference stripped from the object
2. Source member was deleted after the program was compiled
3. Object was restored from a backup that predates the source
4. Third-party supplied program with no source provided

**What you can try:**
- Check if a source member with the same name exists in QRPGLESRC or QCLSRC in the same library
- Ask the original developer or system administrator
- Use `DSPPGM PGM(LIB/NAME)` for any additional compilation details
```

Do **not** error or fail — report clearly and continue.

### Step 5 — Report Bound Service Programs (if available)

If the program info includes bound service programs, list them:
```
**Bound Service Programs:** QSRVPGM, QILERTI
```

## IBM i Background

IBM i programs compiled with ILE RPG (CRTBNDRPG) or CL (CRTCLPGM) embed a reference to the source file, library, and member used at compile time — but only when `DBGVIEW` is not `*NONE`. `QSYS2.PROGRAM_INFO` exposes this as structured columns: `SOURCE_FILE`, `SOURCE_LIBRARY`, `SOURCE_MEMBER`.
