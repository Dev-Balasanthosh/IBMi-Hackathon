---
name: IBM i Dependency Analyzer
description: Use this skill to analyze what objects an IBM i program references or depends on, and what other programs call it. Activate when a developer asks about program dependencies, what files or programs are referenced, what calls this program, or wants to understand the object relationships for an IBM i application.
---

# IBM i Dependency Analyzer

This skill investigates the dependency relationships of an IBM i program — what it references (outbound) and, where supported, what references it (inbound). It produces a readable dependency summary for new developers learning an unfamiliar application.

## When to Use

Activate this skill when the developer asks:
- "What does CUSTUPD reference?"
- "What objects does this program depend on?"
- "What files does ORDHDR use?"
- "What calls CUSTUPD?"
- "Show me the dependencies for this program"
- "What is related to RPTGEN?"

## Steps

### Step 1 — Determine Execution Mode

Call `check_connection`. LIVE if reachable, FALLBACK if not. Display mode badge.

### Step 2 — Confirm the Object

Ensure a program name and library are known. If not, ask: "Which program and library? (e.g. CUSTUPD in QGPL)"

### Step 3A — LIVE Path: Get Program References

Call the MCP tool `get_program_refs` with:
- `program_name`: the program name (uppercase)
- `program_library`: the library

This queries `QSYS2.PROGRAM_OBJECT_INFO` for structured outbound references, with a fallback to `DSPPGMREF` if the view is unavailable.

### Step 3B — FALLBACK Path: Read Program Refs

Read `demo-data/objects/program-refs.json`. Filter the `references` array where `from_object` matches the program name and `from_library` matches the library (case-insensitive).

### Step 4 — Render Outbound Dependency Table

If references were found:
```markdown
### Outbound Dependencies (what CUSTUPD references): ✅ Confirmed

| Object | Library | Type | Usage |
|--------|---------|------|-------|
| BALA01 | BALA981 | *FILE (PF) | INPUT/OUTPUT — customer balance master file |
| INVMST | QGPL | *FILE (LF) | INPUT — inventory master for stock validation |
| ORDHDR | QGPL | *PGM | CALL — retrieves open order count |
| EDTPGM | TESTLIB | *PGM | CALL — field-level validation |
```

If no references were found:
```
No outbound object references found for this program in the current environment.
This may indicate the program uses dynamic calls or the reference data is not available.
```

### Step 5 — Inbound References (what calls this program)

Attempt to determine what other programs call the target program.

**On LIVE path:** Try `QSYS2.PROGRAM_OBJECT_INFO` filtered by referenced object name. If this view does not support inbound queries in the current IBM i release, note the limitation.

**On FALLBACK path:** Search `program-refs.json` for entries where `to_object` matches the program name and `to_library` matches the library. If found, list them as inbound callers.

Render:
```markdown
### Inbound References (what calls CUSTUPD):

| Caller | Library | Type | Usage |
|--------|---------|------|-------|
| ...    | ...     | ...  | ...  |
```

Or if unavailable:
```
ℹ️ Inbound reference analysis (what calls this program) is not available in this environment.
IBM i inbound reference tracking requires additional catalog support that varies by release.
```

## IBM i Background

`DSPPGMREF` is the classic IBM i command for listing outbound program references. `QSYS2.PROGRAM_OBJECT_INFO` provides the same data as structured SQL rows. These show what *files*, *programs*, and *service programs* a program was bound to or references at compile time. Dynamic `CALL` statements using variables may not appear in the reference list.
