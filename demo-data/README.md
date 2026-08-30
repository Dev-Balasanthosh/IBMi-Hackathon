# Demo Data — IBM i Fallback Dataset

This directory contains the local fallback dataset used when PUB400 is not reachable.

## Files

| File | Purpose |
|---|---|
| `ibmi-knowledge-base.md` | Markdown KB — Bob reasons over this on FALLBACK mode |
| `objects/library-list.json` | Simulated QSYS2.LIBRARY_LIST_INFO output |
| `objects/object-catalog.json` | Simulated QSYS2.OBJECT_STATISTICS / DSPOBJD output |
| `objects/program-info.json` | Simulated QSYS2.PROGRAM_INFO / DSPPGM output |
| `objects/program-refs.json` | Simulated DSPPGMREF / dependency output |

## Shared Result Model

All JSON files use the field names defined in `ibmi-knowledge-base.md` under "Shared Result Model".
The MCP server returns the same field names on the live path — so skills work identically in both modes.

## Adding Objects

To add a new demo object:
1. Add an entry to `objects/object-catalog.json` (required)
2. If it's a program, add an entry to `objects/program-info.json`
3. If it has dependencies, add entries to `objects/program-refs.json`
4. Add a section to `ibmi-knowledge-base.md` for Bob to reason over
5. Make sure the object's library appears in `objects/library-list.json`

## Edge Cases Included

| Object | Library | Edge Case |
|---|---|---|
| EDTPGM | TESTLIB | `source_member: null` — source not available |
| RPTGEN | QGPL + DEVLIB | Same name in two libraries — multiple-match clarification flow |
