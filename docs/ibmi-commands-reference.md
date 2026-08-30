# IBM i Commands & QSYS2 SQL Views — Quick Reference

> **IBM i Application Navigator — IBM TechXchange 2026 Hackathon Project**

This reference card covers every IBM i CL command and QSYS2 catalog SQL view used in the project.
For each entry: purpose, syntax, key fields returned, and when to prefer the CL command vs the SQL
alternative.

---

## How to Read This Reference

Each section covers one **CL command** and its **QSYS2 SQL equivalent**. The SQL views are almost
always preferred for programmatic use (MCP tools, Bob skills) because they return structured rows
that can be filtered, joined, and consumed as JSON. The CL commands are useful for interactive
investigation directly in a 5250 session or via SSH.

All SQL examples are run via `QSYS2` system name and work over a JDBC or SSH `db2` session.

---

## 1. DSPLIBL / QSYS2.LIBRARY\_LIST\_INFO

### Purpose

Display the **effective library list** for the current job or session. The library list determines
which libraries are searched (in order) when an unqualified object name is used in a command or
query.

Understanding the library list is the **first step** in the IBM i Application Navigator workflow —
an object cannot be found if its library is not in scope.

---

### CL Command — `DSPLIBL`

```cl
DSPLIBL
```

Or to output to a file:

```cl
DSPLIBL OUTPUT(*OUTFILE) OUTFILE(QTEMP/LIBLOUT)
```

**When to use the CL command:**
- Interactive investigation in a 5250 session.
- Quick visual check of what's currently in scope.
- When you want the traditional IBM i spool output for documentation.

---

### SQL Equivalent — `QSYS2.LIBRARY_LIST_INFO`

```sql
SELECT ORDINAL_POSITION,
       SYSTEM_LIBRARY_NAME AS library,
       TYPE                AS type,
       LIBRARY_TEXT        AS description
FROM QSYS2.LIBRARY_LIST_INFO
ORDER BY ORDINAL_POSITION;
```

**Key fields returned:**

| Field | Description |
|---|---|
| `ORDINAL_POSITION` | Search order (1 = first searched) |
| `SYSTEM_LIBRARY_NAME` | Library name (10 chars) |
| `TYPE` | Library type: `*SYS`, `*PROD`, `*CUR`, `*USR` |
| `LIBRARY_TEXT` | Description text |

**When to use the SQL view:**
- MCP `get_library_list` tool — returns structured JSON rows.
- When you need to check programmatically whether a specific library is in scope before searching.
- When joining with other catalog views.

**MCP tool:** [`get_library_list`](../mcp-ibmi-server/src/index.ts:46)

---

## 2. DSPOBJD / QSYS2.OBJECT\_STATISTICS

### Purpose

Display **object description and metadata** for any IBM i object — programs, files, data areas,
modules, etc. Returns the library it lives in, its type, creation date, last-change timestamp,
text description, and size.

Used in step 3 of the investigation workflow to **confirm an object exists and identify its
library** before proceeding to source location.

---

### CL Command — `DSPOBJD`

```cl
DSPOBJD OBJ(*LIBL/CUSTUPD) OBJTYPE(*PGM)
```

Or to search a specific library:

```cl
DSPOBJD OBJ(BALA981/CUSTUPD) OBJTYPE(*PGM) DETAIL(*FULL)
```

**When to use the CL command:**
- Interactive confirmation that an object exists.
- When you want the full detail view (`DETAIL(*FULL)`) including authority, owner, and storage info.
- When the developer is in a 5250 session and wants the traditional display.

---

### SQL Equivalent — `QSYS2.OBJECT_STATISTICS`

```sql
SELECT OBJNAME            AS object_name,
       OBJLONGSCHEMA      AS library,
       OBJTYPE            AS object_type,
       OBJTEXT            AS text_description,
       OBJCREATED         AS creation_date,
       LAST_CHANGED_TIMESTAMP AS last_change_date,
       OBJSIZE            AS object_size,
       OBJATTRIBUTE       AS attribute
FROM QSYS2.OBJECT_STATISTICS
WHERE OBJNAME = 'CUSTUPD'
  AND OBJTYPE = '*PGM';
```

To search all libraries (not just the library list):

```sql
SELECT * FROM QSYS2.OBJECT_STATISTICS
WHERE OBJNAME = 'CUSTUPD';
```

**Key fields returned:**

| Field | Description |
|---|---|
| `OBJNAME` | Object name |
| `OBJLONGSCHEMA` | Library (schema) name |
| `OBJTYPE` | Object type: `*PGM`, `*FILE`, `*DTAARA`, etc. |
| `OBJTEXT` | 50-char description text |
| `OBJCREATED` | Timestamp when object was created |
| `LAST_CHANGED_TIMESTAMP` | Timestamp of last save-to-library |
| `OBJSIZE` | Object size in bytes |
| `OBJATTRIBUTE` | Sub-type attribute (e.g. `RPGLE`, `CLP`, `PF`, `LF`) |

**When to use the SQL view:**
- MCP `discover_object` tool — searches across all libraries, returns JSON.
- When filtering by type (`OBJTYPE = '*PGM'`) or date range.
- When joining results with `QSYS2.PROGRAM_INFO` for full program metadata in one query.

**MCP tool:** [`discover_object`](../mcp-ibmi-server/src/index.ts:74)

---

## 3. DSPPGM / QSYS2.PROGRAM\_INFO

### Purpose

Display **program attributes** — the source file and member the program was compiled from, which
compiler was used, compilation date, bound modules, target release, and activation group. This is
the key view for **source location** in the investigation workflow.

---

### CL Command — `DSPPGM`

```cl
DSPPGM PGM(BALA981/CUSTUPD)
```

For full detail including bound modules:

```cl
DSPPGM PGM(BALA981/CUSTUPD) DETAIL(*MODULE)
```

**When to use the CL command:**
- Interactive confirmation of source file/member directly in a 5250 session.
- When you need the bound module list interactively (`DETAIL(*MODULE)`).
- Audit scenarios where a printed spool output is needed.

---

### SQL Equivalent — `QSYS2.PROGRAM_INFO`

```sql
SELECT PROGRAM_NAME        AS program_name,
       PROGRAM_LIBRARY     AS program_library,
       SOURCE_FILE         AS source_file,
       SOURCE_LIBRARY      AS source_library,
       SOURCE_MEMBER       AS source_member,
       PROGRAM_TYPE        AS compiler,
       CREATION_DATE       AS creation_date,
       LAST_USED_TIMESTAMP AS last_used,
       TARGET_RELEASE      AS target_release
FROM QSYS2.PROGRAM_INFO
WHERE PROGRAM_NAME    = 'CUSTUPD'
  AND PROGRAM_LIBRARY = 'BALA981';
```

**Key fields returned:**

| Field | Description |
|---|---|
| `PROGRAM_NAME` | Program object name |
| `PROGRAM_LIBRARY` | Library containing the program |
| `SOURCE_FILE` | Source physical file (e.g. `QRPGLESRC`) |
| `SOURCE_LIBRARY` | Library of the source file |
| `SOURCE_MEMBER` | Source member name within the source file |
| `PROGRAM_TYPE` | Compiler / language: `RPGLE`, `CLP`, `CBLLE`, etc. |
| `CREATION_DATE` | Date the program was compiled |
| `LAST_USED_TIMESTAMP` | Last time the program was called |
| `TARGET_RELEASE` | Minimum OS/400 release required |

**When to use the SQL view:**
- MCP `get_program_info` tool — returns structured JSON for source-locator skill.
- When joining with `QSYS2.OBJECT_STATISTICS` to combine metadata and source info.
- When querying multiple programs at once (no CL equivalent for bulk queries).

**MCP tool:** [`get_program_info`](../mcp-ibmi-server/src/index.ts:109)

---

## 4. DSPPGMREF / QSYS2.PROGRAM\_OBJECT\_INFO

### Purpose

Display the **outbound object references** from a program — i.e., every file, program, data area,
module, or other object that this program references. This is the dependency graph edge list for
the **dependency analysis** step of the investigation workflow.

---

### CL Command — `DSPPGMREF`

```cl
DSPPGMREF PGM(BALA981/CUSTUPD)
```

Output to a spool file for review:

```cl
DSPPGMREF PGM(BALA981/CUSTUPD) OUTPUT(*PRINT)
```

Output to an outfile for scripted use:

```cl
DSPPGMREF PGM(BALA981/CUSTUPD) OUTPUT(*OUTFILE) OUTFILE(QTEMP/PGMREFS)
```

**When to use the CL command:**
- Interactive review of program references in a 5250 session.
- When `QSYS2.PROGRAM_OBJECT_INFO` is not available (older OS releases).
- When an auditable printed report is needed.

---

### SQL Equivalent — `QSYS2.PROGRAM\_OBJECT\_INFO`

```sql
SELECT PROGRAM_NAME         AS from_object,
       PROGRAM_LIBRARY      AS from_library,
       BOUND_OBJECT_NAME    AS to_object,
       BOUND_OBJECT_LIBRARY AS to_library,
       BOUND_OBJECT_TYPE    AS to_type,
       BINDING_ATTRIBUTE    AS usage
FROM QSYS2.PROGRAM_OBJECT_INFO
WHERE PROGRAM_NAME    = 'CUSTUPD'
  AND PROGRAM_LIBRARY = 'BALA981';
```

**Key fields returned:**

| Field | Description |
|---|---|
| `PROGRAM_NAME` | The calling program |
| `PROGRAM_LIBRARY` | Library of the calling program |
| `BOUND_OBJECT_NAME` | Referenced object name |
| `BOUND_OBJECT_LIBRARY` | Library of the referenced object |
| `BOUND_OBJECT_TYPE` | Type of referenced object (`*FILE`, `*PGM`, `*SRVPGM`, etc.) |
| `BINDING_ATTRIBUTE` | How the object is used (e.g. `*USED`, `*IMPORT`) |

**When to use the SQL view:**
- MCP `get_program_refs` tool — primary method; returns structured JSON dependency rows.
- When filtering by reference type (e.g., only `*FILE` references for a data flow diagram).
- When performing reverse dependency lookups with a `WHERE BOUND_OBJECT_NAME = 'CUSTMST'` clause.

> **Fallback behaviour:** The MCP `get_program_refs` tool first attempts
> `QSYS2.PROGRAM_OBJECT_INFO`. If that view is unavailable (older OS release), it falls back to
> executing `DSPPGMREF ... OUTPUT(*PRINT)` via SSH and parsing the output.

**MCP tool:** [`get_program_refs`](../mcp-ibmi-server/src/index.ts:144)

---

## 5. ADDLIBLE

### Purpose

Add a library to the **current job's library list**, making objects in that library visible to
subsequent commands and SQL queries that use unqualified names. This is a session-scoped change —
it does not persist after the SSH session ends.

This command has **no direct QSYS2 SQL equivalent** — it is a session-state mutation, not a
catalog query.

---

### CL Command — `ADDLIBLE`

```cl
ADDLIBLE LIB(BALA981)
```

Specify position in the list:

```cl
ADDLIBLE LIB(BALA981) POSITION(*FIRST)
```

Or after a named library:

```cl
ADDLIBLE LIB(BALA981) POSITION(*AFTER) BFRLIBE(QGPL)
```

**Key parameters:**

| Parameter | Description |
|---|---|
| `LIB` | Library name to add |
| `POSITION` | Where to insert: `*FIRST`, `*LAST`, `*AFTER`, `*BEFORE` (default `*LAST`) |
| `BFRLIBE` | Reference library when `POSITION(*AFTER)` or `*BEFORE` |

**When to use:**
- When `discover_object` returns no results because the target library is not yet in scope.
- At the start of an SSH session to set up the working library list before running SQL queries.
- Via the MCP `execute_ibmi_command` tool:
  ```
  Ask Bob: Run execute_ibmi_command with: system "ADDLIBLE LIB(BALA981)"
  ```

**Important:** ADDLIBLE affects the SSH session used by the MCP server connection. Run it via
`execute_ibmi_command` before tools that rely on unqualified library searches.

---

## QSYS2 Services — Summary Table

| SQL View | CL Equivalent | MCP Tool | Primary Use |
|---|---|---|---|
| `QSYS2.LIBRARY_LIST_INFO` | `DSPLIBL` | `get_library_list` | List libraries in scope |
| `QSYS2.OBJECT_STATISTICS` | `DSPOBJD` | `discover_object` | Find object + metadata |
| `QSYS2.PROGRAM_INFO` | `DSPPGM` | `get_program_info` | Source file/member/compiler |
| `QSYS2.PROGRAM_OBJECT_INFO` | `DSPPGMREF` | `get_program_refs` | Outbound dependencies |
| *(none)* | `ADDLIBLE` | `execute_ibmi_command` | Add library to session scope |

---

## SQL vs CL — Decision Guide

```
Is the operation a query (read) or a session mutation (write/configure)?
├── Query → prefer QSYS2 SQL view
│   ├── Returns structured rows (JSON-friendly)
│   ├── Filterable with WHERE clauses
│   ├── Joinable with other catalog views
│   └── Works over JDBC and SSH db2 sessions
└── Mutation → use CL command via execute_ibmi_command
    ├── ADDLIBLE, RMVLIBLE (library list)
    └── Any command that changes session or object state
```

For interactive investigation in a 5250 session or an SSH shell, either form works — use whichever
is faster to type. For programmatic use in MCP tools or Bob skills, **always prefer the SQL view**.

---

*Last updated for IBM TechXchange 2026 Hackathon demo — IBM i Application Navigator.*
