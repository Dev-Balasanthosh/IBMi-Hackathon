# IBM i Demo Dataset — Knowledge Base

This file is the Markdown knowledge base used by Bob's skills when running in **LOCAL FALLBACK** mode
(i.e. when PUB400 is not reachable). Bob reasons over this file to answer investigation questions.
The JSON files in `objects/` contain the same data in machine-readable form.

---

## Library List

The effective library list for this demo environment contains the following libraries in order:

| # | Library  | Type | Description |
|---|----------|------|-------------|
| 1 | QSYS     | SYS  | IBM i System Library |
| 2 | QSYS2    | SYS  | IBM i System Library 2 — SQL catalog services (QSYS2.*) |
| 3 | QUSRSYS  | SYS  | IBM i User System Library |
| 4 | QGPL     | PROD | General Purpose Library — main application objects live here |
| 5 | BALA981  | PROD | Customer balance application library |
| 6 | TESTLIB  | USR  | Test and development library |
| 7 | DEVLIB   | USR  | Developer working library |
| 8 | QTEMP    | CUR  | Temporary session-scoped library |

**Note:** If a user requests an object in a library not listed above (e.g. CUSTLIB, APPLIB), that library
is not in scope. Suggest `ADDLIBLE <library>` to add it before repeating the search.

---

## Object: CUSTUPD (Normal Case — Primary Demo Object)

**Object name:** CUSTUPD
**Library:** QGPL
**Object type:** *PGM
**Attribute:** RPGLE
**Description:** Customer record update program
**Created:** 2022-03-15
**Last changed:** 2024-11-08
**Object size:** 49,152 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QRPGLESRC |
| Source library | QGPL |
| Source member | CUSTUPD |
| Compiler | CRTBNDRPG |
| Target release | V7R4M0 |
| Debug data | Yes |

### Bound Service Programs
- QSRVPGM
- QILERTI

### Dependencies (Outbound — what CUSTUPD references)
| Object | Library | Type | Usage |
|---|---|---|---|
| BALA01 | BALA981 | *FILE (PF) | INPUT/OUTPUT — customer balance master file read and updated |
| INVMST | QGPL | *FILE (LF) | INPUT — inventory master logical file read for stock validation |
| ORDHDR | QGPL | *PGM | CALL — order header program called to retrieve open order count |
| EDTPGM | TESTLIB | *PGM | CALL — edit/validation program called for field-level validation |

---

## Object: BALA01 (Physical File — Active Source Member)

**Object name:** BALA01
**Library:** BALA981
**Object type:** *FILE
**Attribute:** PF (Physical File)
**Description:** Customer balance master file — physical file
**Created:** 2021-07-20
**Last changed:** 2024-09-03
**Object size:** 8,192 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QDDSSRC |
| Source library | BALA981 |
| Source member | BALA01 |
| Compiler | CRTPF |

### Dependencies
No outbound program references — this is a data file (PF). It is referenced by CUSTUPD, ORDHDR, and RPTGEN.

### Notes
This file holds the customer balance records used by the customer update and reporting programs.
The DDS source is in `BALA981/QDDSSRC` member `BALA01`. A copy of the source is also in the project
at `BALA981/QRPGLESRC/BALA01.PF` for reference.

---

## Object: ORDHDR (Referenced Program)

**Object name:** ORDHDR
**Library:** QGPL
**Object type:** *PGM
**Attribute:** RPGLE
**Description:** Order header processing program
**Created:** 2021-11-05
**Last changed:** 2023-06-14
**Object size:** 32,768 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QRPGLESRC |
| Source library | QGPL |
| Source member | ORDHDR |
| Compiler | CRTBNDRPG |
| Target release | V7R4M0 |
| Debug data | Yes |

### Dependencies (Outbound)
| Object | Library | Type | Usage |
|---|---|---|---|
| BALA01 | BALA981 | *FILE (PF) | INPUT — customer balance file read to validate credit limit |

---

## Object: INVMST (Logical File — Referenced by CUSTUPD)

**Object name:** INVMST
**Library:** QGPL
**Object type:** *FILE
**Attribute:** LF (Logical File)
**Description:** Inventory master file — logical file over INVPF
**Created:** 2020-04-12
**Last changed:** 2024-01-22
**Object size:** 4,096 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QDDSSRC |
| Source library | QGPL |
| Source member | INVMST |
| Compiler | CRTLF |

### Dependencies
No outbound program references — logical file. Referenced by CUSTUPD for inventory validation.

---

## Object: EDTPGM — Edge Case: Source Member Not Available

**Object name:** EDTPGM
**Library:** TESTLIB
**Object type:** *PGM
**Attribute:** RPGLE
**Description:** Edit/validation program — source not available
**Created:** 2019-08-30
**Last changed:** 2019-08-30
**Object size:** 16,384 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | ⚠️ Not available |
| Source library | ⚠️ Not available |
| Source member | ⚠️ Not available |
| Compiler | CRTBNDRPG |
| Target release | V7R2M0 |
| Debug data | **No** — compiled with *FULL optimization, debug data excluded |

### Why Source Is Not Available
This program was compiled with `OPTIMIZE(*FULL)` and `DBGVIEW(*NONE)`, which strips the source
reference from the program object. The original source member may have been deleted or was never
kept in a source physical file. Common reasons:

1. Compiled with `DBGVIEW(*NONE)` — source reference not embedded in object
2. Source member deleted after compilation
3. Object restored from a backup that predates the source
4. Third-party supplied object with no source provided

### Dependencies
No outbound program references recorded in this environment.

---

## Object: RPTGEN — Edge Case: Multiple Library Matches

**⚠️ This object exists in TWO libraries. Clarification is required.**

### RPTGEN in QGPL (Production Version)

**Object name:** RPTGEN
**Library:** QGPL
**Object type:** *PGM
**Attribute:** RPGLE
**Description:** Report generator — production version in QGPL
**Created:** 2022-01-10
**Last changed:** 2024-07-19
**Object size:** 40,960 bytes

#### Source Location
| Field | Value |
|---|---|
| Source file | QRPGLESRC |
| Source library | QGPL |
| Source member | RPTGEN |
| Compiler | CRTBNDRPG |
| Target release | V7R4M0 |
| Debug data | Yes |

#### Dependencies (Outbound)
| Object | Library | Type | Usage |
|---|---|---|---|
| BALA01 | BALA981 | *FILE (PF) | INPUT — balance file read for report generation |
| INVMST | QGPL | *FILE (LF) | INPUT — inventory master read for stock report |

---

### RPTGEN in DEVLIB (Development/Test Version)

**Object name:** RPTGEN
**Library:** DEVLIB
**Object type:** *PGM
**Attribute:** RPGLE
**Description:** Report generator — development/test version in DEVLIB
**Created:** 2024-10-01
**Last changed:** 2024-12-15
**Object size:** 41,984 bytes

#### Source Location
| Field | Value |
|---|---|
| Source file | QRPGLESRC |
| Source library | DEVLIB |
| Source member | RPTGEN |
| Compiler | CRTBNDRPG |
| Target release | V7R5M0 |
| Debug data | Yes |

#### Dependencies (Outbound)
| Object | Library | Type | Usage |
|---|---|---|---|
| BALA01 | BALA981 | *FILE (PF) | INPUT — balance file read for report generation (dev version) |

---

## Object: CUSTDSP (Display Program — RPGLE with WORKSTN File)

**Object name:** CUSTDSP
**Library:** QGPL
**Object type:** *PGM
**Attribute:** RPGLE
**Description:** Customer display program — RPGLE display file handler
**Created:** 2023-05-18
**Last changed:** 2024-08-22
**Object size:** 36,864 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QRPGLESRC |
| Source library | QGPL |
| Source member | CUSTDSP |
| Compiler | CRTBNDRPG |
| Target release | V7R4M0 |
| Debug data | Yes |

### Bound Service Programs
- QSRVPGM

### Dependencies (Outbound — what CUSTDSP references)
| Object | Library | Type | Usage |
|---|---|---|---|
| BALA01 | BALA981 | *FILE (PF) | INPUT — customer balance master file read for display |
| CUSTDSPF | QGPL | *FILE (DSPF) | WORKSTN — display file used for interactive customer screen |

### Inbound References (what calls CUSTDSP)
- CUSTCL (*PGM QGPL) — called for interactive confirmation from the CL batch driver

---

## Object: CUSTDSPF (Display File — DDS DSPF)

**Object name:** CUSTDSPF
**Library:** QGPL
**Object type:** *FILE
**Attribute:** DSPF (Display File)
**Description:** Customer display file — DDS display format definitions
**Created:** 2023-05-10
**Last changed:** 2024-06-01
**Object size:** 12,288 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QDDSSRC |
| Source library | QGPL |
| Source member | CUSTDSPF |
| Compiler | CRTDSPF |

### Dependencies
No outbound program references — this is a display file (DSPF). It is referenced by CUSTDSP as its WORKSTN file.

---

## Object: CUSTCL (CL Batch Driver Program)

**Object name:** CUSTCL
**Library:** QGPL
**Object type:** *PGM
**Attribute:** CLP
**Description:** Customer batch CL driver — calls CUSTUPD and CUSTDSP
**Created:** 2021-09-14
**Last changed:** 2024-03-05
**Object size:** 8,192 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QCLSRC |
| Source library | QGPL |
| Source member | CUSTCL |
| Compiler | CRTCLPGM |
| Target release | V7R4M0 |
| Debug data | Yes |

### Dependencies (Outbound — what CUSTCL calls)
| Object | Library | Type | Usage |
|---|---|---|---|
| CUSTUPD | QGPL | *PGM | CALL — customer update program called from CL batch driver |
| CUSTDSP | QGPL | *PGM | CALL — customer display program called for interactive confirmation |

---

## Object: BALASRV (Service Program — Shared Business Logic)

**Object name:** BALASRV
**Library:** BALA981
**Object type:** *SRVPGM
**Attribute:** RPGLE
**Description:** Customer balance service program — shared business logic
**Created:** 2022-11-03
**Last changed:** 2024-10-17
**Object size:** 57,344 bytes

### Source Location
| Field | Value |
|---|---|
| Source file | QRPGLESRC |
| Source library | BALA981 |
| Source member | BALASRV |
| Compiler | CRTSRVPGM |
| Target release | V7R4M0 |
| Debug data | Yes |

### Bound Service Programs
- QSRVPGM
- QILERTI

### Dependencies
No outbound file or program references — this is a service program providing exported procedures.
Referenced (bound) by CUSTUPD (*PGM QGPL) for shared balance calculation logic.

---

## Demo Scenarios

### Scenario 1 — Normal Happy Path (CUSTUPD)
Request: *"Find program CUSTUPD. Where is its source, when was it last updated, and what objects are related to it?"*

Expected flow:
1. Library list resolved — QGPL is in scope ✅
2. CUSTUPD found in QGPL as *PGM ✅
3. Source: QGPL/QRPGLESRC member CUSTUPD ✅
4. Last changed: 2024-11-08 ✅
5. Dependencies: BALA01, INVMST, ORDHDR, EDTPGM ✅

### Scenario 2 — Edge Case: Missing Source (EDTPGM)
Request: *"Find EDTPGM in TESTLIB and show me its source."*

Expected flow:
1. Library list — TESTLIB is in scope ✅
2. EDTPGM found in TESTLIB ✅
3. Source: ⚠️ Not available — compiled without debug data ✅ (graceful message, no error)

### Scenario 3 — Edge Case: Multiple Library Matches (RPTGEN)
Request: *"Find program RPTGEN."*

Expected flow:
1. Library list resolved ✅
2. RPTGEN found in **two** libraries: QGPL and DEVLIB ✅
3. Bob presents candidate table and asks: *"Which library do you want — QGPL (production) or DEVLIB (development)?"*

---

## Shared Result Model Field Names

All JSON files and live IBM i tool responses use these field names for consistency:

| Field | Description |
|---|---|
| `object_name` | IBM i object name (max 10 chars) |
| `library` | Library containing the object |
| `object_type` | IBM i object type (*PGM, *FILE, *SRVPGM, etc.) |
| `text_description` | Object text description |
| `creation_date` | Date object was created (YYYY-MM-DD) |
| `last_change_date` | Date object was last changed (YYYY-MM-DD) |
| `source_file` | Source physical file name (null if not available) |
| `source_member` | Source member name (null if not available) |
| `source_library` | Library containing the source file (null if not available) |
| `object_size` | Object size in bytes |
| `compiler` | Compiler command used to create the object |
| `from_object` | Dependency: referencing object name |
| `from_library` | Dependency: referencing object library |
| `to_object` | Dependency: referenced object name |
| `to_library` | Dependency: referenced object library |
| `to_type` | Dependency: referenced object type |
| `usage` | Dependency: description of how the object is used |
