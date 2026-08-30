---
name: IBM i Application Navigator
description: Use this skill whenever a developer asks to find, investigate, locate, analyse, or understand an IBM i program, object, or source member. This skill runs the complete agentic investigation workflow — connection check, library scope, object discovery, source location, dependency analysis — and returns a full structured result card with an investigation trace. Activate for requests like "find program X", "where is CUSTUPD", "investigate IBM i object", "show me the source for", "what does this program reference", or any similar IBM i application navigation request.
---

# IBM i Application Navigator

You are an agentic IBM i application navigator. When activated, follow **all 6 steps below in order** using this single skill. Do not activate other skills. Call MCP tools directly on the LIVE path, or read the local dataset files on the FALLBACK path.

---

## STEP 1 — Connection Check

Call the MCP tool `check_connection` (no parameters).

**If `reachable: true`:** Set mode = **LIVE**. Display:
```
🟢 LIVE IBM i — pub400.com
```

**If `reachable: false` or any error:** Set mode = **FALLBACK**. Display:
```
🟡 LOCAL FALLBACK — demo dataset active
Reason: [error or timeout message]
```

Remember the mode — every subsequent step uses the same path.

---

## STEP 2 — Library List Resolution

**LIVE:** Call `get_library_list` (no parameters). This returns the ordered library list from `QSYS2.LIBRARY_LIST_INFO`.

**FALLBACK:** Read `demo-data/objects/library-list.json`. Use the `library_list` array.

Render the library list as a compact Markdown table. Then check: is the library where the requested object is expected to live included in the list?

**If the expected library is MISSING from the list:**
```
⚠️ Library [LIBNAME] is not in the current library list.
Investigation cannot continue until this library is in scope.
To add it, run: ADDLIBLE LIBNAME
```
**Stop here** and report this as the finding. Do not proceed to Step 3.

**If the library is present (or no specific library was mentioned):** Continue to Step 3.

---

## STEP 3 — Object Discovery

Extract the object name from the developer's request. Use uppercase, max 10 characters.

**LIVE:** Call `discover_object` with `object_name` (and optionally `object_type` if specified).

**FALLBACK:** Read `demo-data/objects/object-catalog.json`. Search the `objects` array for all entries where `object_name` matches (case-insensitive).

### Single match found:
Record the object details (library, type, description, dates, size). Continue to Step 4.

### Multiple matches found (same name, different libraries):
```
⚠️ Multiple objects found with the name [NAME]:

| Library | Type | Description | Last Changed |
|---------|------|-------------|--------------|
| QGPL    | *PGM | Production version | 2024-07-19 |
| DEVLIB  | *PGM | Development version | 2024-12-15 |

Which library did you mean? Please reply with the library name to continue.
```
**Stop here** and wait for clarification before continuing.

### No match found:
```
❌ Object [NAME] was not found in the current library scope.
Libraries checked: [list from Step 2]
Suggestion: verify the object name or use ADDLIBLE to add a missing library.
```
**Stop here.**

---

## STEP 4 — Source Location

Use the object name and library confirmed in Step 3.

**LIVE:** Call `get_program_info` with `program_name` and `program_library`.

**FALLBACK:** Read `demo-data/objects/program-info.json`. Find the entry in `programs` where `program_name` and `program_library` match (case-insensitive).

**Note:** If the object is a *FILE (not a *PGM), skip the program_info lookup and note "Source info is via DDS — check QDDSSRC for the source member with the same name as the file."

### Source is available (`source_member` is not null):
Record source_file, source_library, source_member, compiler, target_release, debug_data. Continue to Step 5.

### Source is NOT available (`source_member` is null or debug_data is false):
Record as "Source member not available". Continue to Step 5 (do not stop — this is a soft finding).

---

## STEP 5 — Dependency Analysis

**LIVE:** Call `get_program_refs` with `program_name` and `program_library`.

**FALLBACK:** Read `demo-data/objects/program-refs.json`. Filter `references` array where `from_object` and `from_library` match (case-insensitive). Collect all matches.

Also check for **inbound** references:
- **FALLBACK:** Search `program-refs.json` for entries where `to_object` matches the program name
- **LIVE:** Attempt `QSYS2.PROGRAM_OBJECT_INFO`; if unavailable, note the limitation

Record all dependency data. Continue to Step 6.

---

## STEP 6 — Final Answer

Assemble and render the complete investigation result using the template below. Fill in every section from the data collected in Steps 1–5.

---

```markdown
## IBM i Investigation Result

**Mode:** [🟢 LIVE IBM i — pub400.com] OR [🟡 LOCAL FALLBACK — demo dataset]

---

### 📦 Object

| Field | Value |
|---|---|
| Name | [object_name] |
| Library | [library] |
| Type | [object_type] |
| Attribute | [attribute] |
| Description | [text_description] |
| Created | [creation_date] |
| Last Changed | [last_change_date] |
| Size | [object_size] bytes |

---

### 📄 Source Location

| Field | Value |
|---|---|
| Source File | [source_file OR ⚠️ Not available] |
| Source Library | [source_library OR ⚠️ Not available] |
| Source Member | [source_member OR ⚠️ Not available] |
| Compiler | [compiler] |
| Target Release | [target_release] |
| Debug Data | [Yes / No] |

[If source not available, include the explanation from Step 4]

---

### 🔗 Dependencies

#### Outbound (what [PROGRAM] references):

| Object | Library | Type | Usage |
|--------|---------|------|-------|
| [to_object] | [to_library] | [to_type] | [usage] |

[If no outbound refs: "No outbound references found."]

#### Inbound (what calls [PROGRAM]):

| Caller | Library | Type | Usage |
|--------|---------|------|-------|
| [from_object callers] | ... | ... | ... |

[If inbound not available: "ℹ️ Inbound reference analysis not available in this environment."]

---

### 🔍 Investigation Trace

1. **Connection check** → [🟢 LIVE pub400.com] OR [🟡 FALLBACK — reason]
2. **Library list resolved** → [N] libraries in scope; [LIBNAME] ✅ present / ⚠️ absent
3. **Object discovered** → [NAME] in [LIBRARY] as [TYPE], last changed [DATE]
4. **Source located** → [LIBRARY/SOURCEFILE(MEMBER)] OR [⚠️ not available — reason]
5. **Dependencies analysed** → [N] outbound references; inbound [found N / not available]

---

⏱️ *Estimated manual investigation: ~15 min | Bob: ~30 sec — illustrative values*
```

---

## Result Quality Rules

- Use `✅ Confirmed` for every fact retrieved from live IBM i data or the local dataset
- Use `⚠️ Not available` for any field that is null, missing, or unknown
- Never fabricate object names, library names, dates, or dependency relationships
- If the fallback dataset does not contain the requested object, say so clearly — do not invent data
- All timestamps and dates come from the dataset or IBM i — do not substitute with today's date
- The time-saved metric is always labelled "illustrative values" — never present it as measured data
