# PUB400 Setup Guide

> **IBM i Application Navigator — IBM TechXchange 2026 Hackathon Project**

This guide walks through every step required to connect the IBM i Application Navigator to a live
PUB400 IBM i system, from account registration to running the first live demo.

---

## What Is PUB400?

[PUB400.com](https://pub400.com) is a **free public IBM i server** maintained by Volker Lenhart.
It runs a real IBM i (AS/400) operating system and is openly accessible to developers who want to
learn IBM i, test tooling, or demonstrate applications without owning on-premise hardware.

| Property | Value |
|---|---|
| Hostname | `pub400.com` |
| SSH port | `22` |
| OS | IBM i (OS/400) |
| Cost | Free |
| Authentication | SSH key-based (password login disabled) |
| Access | Shared, public, read-friendly — **no write access to system libraries** |

> **Why PUB400 for this project?** The IBM i Application Navigator needs a real IBM i endpoint to
> demonstrate live connection probing, library list resolution, object discovery, source location,
> and dependency analysis. PUB400 provides all of this without any infrastructure cost.

---

## Step 1: Register for a PUB400 Account

1. Open a browser and go to **[https://pub400.com](https://pub400.com)**.
2. Click **Register** (or **New User Registration**) in the navigation.
3. Fill in the registration form:
   - **Desired username** — choose something short, all uppercase, max 10 characters (IBM i convention).
     Example: `PRAVEENK`
   - **Email address** — a valid address; your credentials and welcome email are sent here.
   - **First / Last name** and any other required fields.
4. Submit the form. You will receive a **confirmation email** with your initial password and
   instructions for first login.
5. Follow any first-login instructions in the email (e.g., changing the temporary password).

> **Tip:** IBM i usernames are case-insensitive on the system but are stored uppercase. Use
> uppercase everywhere in this project to avoid confusion.

---

## Step 2: Add Your SSH Public Key to PUB400

PUB400 only accepts **SSH key authentication** — password-based SSH is disabled. You must upload
your public key through the PUB400 web portal.

Your SSH key pair was already generated at:

| File | Path |
|---|---|
| **Private key** (keep secret) | `C:\Users\praveen\.ssh\id_ed25519` |
| **Public key** (safe to share) | `C:\Users\praveen\.ssh\id_ed25519.pub` |

### Get Your Public Key

Open PowerShell and run:

```powershell
Get-Content C:\Users\praveen\.ssh\id_ed25519.pub
```

The output will look like:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... praveen@hostname
```

Copy the **entire line** — from `ssh-ed25519` to the end (including your hostname comment).

### Upload the Key to PUB400

1. Log in to **[https://pub400.com](https://pub400.com)** with your registered account.
2. Navigate to **My Account** → **SSH Public Keys** (or **Manage SSH Keys**).
3. Click **Add New Key**.
4. Paste the entire public key line into the text box.
5. Save. The key is active within a few minutes (sometimes immediately).

> **Do not paste the private key** (`id_ed25519`, no `.pub` extension). The private key never
> leaves your machine.

---

## Step 3: Update the `.env` File

The project reads all IBM i connection details from a `.env` file in the project root.

### Copy the template (if you haven't already)

```powershell
Copy-Item .env.example .env
```

### Edit `.env`

Open `.env` in any text editor and replace the placeholder values with your real credentials:

```dotenv
# IBM i Application Navigator — Environment Variables

# PUB400 IBM i hostname
IBMI_HOST=pub400.com

# Your PUB400 SSH username  ← replace with your registered username
IBMI_USER=PRAVEENK

# Absolute path to your SSH private key file
IBMI_SSH_KEY_PATH=C:\Users\praveen\.ssh\id_ed25519

# SSH port (default 22 for PUB400)
IBMI_PORT=22
```

**Key changes to make:**

| Variable | Replace with |
|---|---|
| `IBMI_USER` | Your actual PUB400 username (e.g. `PRAVEENK`) |
| `IBMI_SSH_KEY_PATH` | `C:\Users\praveen\.ssh\id_ed25519` (already the right path) |

> **Security reminder:** `.env` is listed in `.gitignore`. It will never be committed to source
> control. Never share or commit this file.

---

## Step 4: Test the SSH Connection Manually

Before starting Bob, confirm that SSH authentication works from the command line.

Open PowerShell and run (replacing `PRAVEENK` with your username):

```powershell
ssh -i C:\Users\praveen\.ssh\id_ed25519 PRAVEENK@pub400.com
```

**Expected output on success:**

```
                    Welcome to PUB400.COM
        A free IBM i system for education and development
...
$
```

You should land at a shell prompt (`$` or `%`). Type `exit` to disconnect.

**If the connection is refused or hangs**, see the [Troubleshooting](#troubleshooting) section
below.

---

## Step 5: Load `.env` in PowerShell Before Starting Bob

The MCP server reads credentials from process environment variables. You must load `.env` into
your current PowerShell session **before** launching Bob so that the MCP server inherits the
values.

Open PowerShell in the project root (`C:\Users\praveen\OneDrive\Desktop\IBMi_project`) and run:

```powershell
Get-Content .env |
  Where-Object { $_ -notmatch '^\s*#' -and $_ -ne '' } |
  ForEach-Object {
    $k, $v = $_ -split '=', 2
    [System.Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim(), 'Process')
  }
```

### Verify the variables were loaded

```powershell
$env:IBMI_HOST
$env:IBMI_USER
$env:IBMI_SSH_KEY_PATH
$env:IBMI_PORT
```

Each line should print the corresponding value from your `.env` file (e.g. `pub400.com`,
`PRAVEENK`, `C:\Users\praveen\.ssh\id_ed25519`, `22`).

> **Important:** This sets variables for the **current PowerShell session only**. You must re-run
> this block every time you open a new terminal. It does not persist after the window closes.

---

## Step 6: Test the MCP Server `check_connection` Tool

With the environment loaded and Bob open on the project, ask Bob to run a connection check.

In Bob (Ask or Agent mode), type:

```
Run the check_connection MCP tool and tell me if PUB400 is reachable.
```

**Expected response when PUB400 is reachable:**

```json
{
  "reachable": true,
  "host": "pub400.com",
  "port": 22,
  "latency_ms": 142
}
```

Bob will report: **🟢 LIVE — PUB400 is reachable.**

**Expected response when PUB400 is not reachable (fallback mode):**

```json
{
  "reachable": false,
  "error": "Connection timed out"
}
```

Bob will report: **🟡 FALLBACK — using local demo dataset.**

The fallback dataset is in [`demo-data/`](../demo-data/) and covers CUSTUPD and related objects
so the demo still works without a live connection.

---

## Step 7: Run the Live Demo — "Find Program CUSTUPD"

Once `check_connection` returns `reachable: true`, run the full investigation workflow.

In Bob (Ask or Agent mode), type:

```
Find program CUSTUPD. Where is its source code, when was it last updated,
and what objects are related to it?
```

Bob will independently execute the following investigation steps:

| Step | Skill / Tool | What Happens |
|---|---|---|
| 1 | `explanation-orchestrator` | Activates the IBM i Application Navigator workflow |
| 2 | `connection-resolver` → `check_connection` | Probes PUB400 — confirms 🟢 LIVE |
| 3 | `library-list-resolver` → `get_library_list` | Resolves effective library list |
| 4 | `object-discovery` → `discover_object` | Finds CUSTUPD object + library |
| 5 | `source-locator` → `get_program_info` | Resolves source file, library, member |
| 6 | `dependency-analyzer` → `get_program_refs` | Lists outbound references |
| 7 | Final answer | Structured result card + investigation trace |

**Expected output includes:**
- Program library (e.g. `BALA981`)
- Source file and member (e.g. `QRPGLESRC/CUSTUPD`)
- Compiler (e.g. `RPGLE`, `CLP`)
- Creation date and last change timestamp
- List of referenced objects (files, programs, data areas)

---

## Troubleshooting

### SSH Key Not Accepted

**Symptom:** `ssh` returns `Permission denied (publickey)`.

**Fixes:**
1. Confirm the public key was saved on PUB400's web portal — log in and check **My Account → SSH Keys**.
2. Verify you are using the **private** key path (no `.pub`) in the `-i` flag and in `IBMI_SSH_KEY_PATH`.
3. Check file permissions. Windows SSH client requires the private key to be readable only by your user:
   ```powershell
   icacls C:\Users\praveen\.ssh\id_ed25519 /inheritance:r /grant:r "$($env:USERNAME):(R)"
   ```
4. Try adding `-v` to the ssh command for verbose output:
   ```powershell
   ssh -v -i C:\Users\praveen\.ssh\id_ed25519 PRAVEENK@pub400.com
   ```

---

### Wrong Username

**Symptom:** Authentication fails or you receive `User profile not found`.

**Fixes:**
1. Double-check the username in `.env` matches exactly what you registered on PUB400.
2. IBM i usernames are stored uppercase — use `PRAVEENK` not `praveenk`.
3. Log in to [pub400.com](https://pub400.com) in a browser to confirm your username.

---

### Firewall or Port Blocked

**Symptom:** `ssh` hangs with no output, or `Connection timed out` after ~30 seconds.

**Fixes:**
1. Confirm port 22 is open outbound on your network. Corporate or hotel networks often block it.
2. Try from a personal hotspot or home network.
3. If port 22 is permanently blocked, PUB400 does not offer an alternative port — the Bob fallback
   mode (local demo dataset) is the recommended alternative for restricted environments.

---

### Library Not in Scope

**Symptom:** `discover_object` returns an empty result even though the program exists on PUB400.

**Fixes:**
1. The QSYS2 catalog views search the current session's library list. A freshly logged-in SSH
   session starts with only system libraries.
2. Use the `execute_ibmi_command` tool to add the required library to the list:
   ```
   Ask Bob: Run execute_ibmi_command with: system "ADDLIBLE LIB(BALA981)"
   ```
3. Then re-run `discover_object` — the library is now in scope.
4. Alternatively, qualify the object name with its library in your query:
   ```
   Find program CUSTUPD in library BALA981
   ```

---

### MCP Server Does Not Start

**Symptom:** Bob reports it cannot find or call the `check_connection` tool.

**Fixes:**
1. Build the MCP server if you haven't:
   ```powershell
   cd mcp-ibmi-server
   npm install
   npm run build
   cd ..
   ```
2. Confirm `.bob/mcp.json` points to the correct built file:
   ```powershell
   Get-Content .bob/mcp.json
   ```
3. Reload the Bob window after building (Ctrl+Shift+P → Reload Window).

---

### Environment Variables Not Loaded

**Symptom:** The MCP server returns `IBMI_HOST not set` or `Missing required environment variable`.

**Fix:** Re-run the PowerShell `.env` loader from [Step 5](#step-5-load-env-in-powershell-before-starting-bob).
The variables are session-scoped — closing and reopening PowerShell clears them.

---

## IBM i Commands Reference

A quick summary of the key IBM i commands used in this project. For the full reference with SQL
alternatives, field descriptions, and usage guidance see
[`docs/ibmi-commands-reference.md`](./ibmi-commands-reference.md).

| Command / View | Purpose |
|---|---|
| `DSPLIBL` | Display the job's effective library list |
| `QSYS2.LIBRARY_LIST_INFO` | SQL version of DSPLIBL — structured rows |
| `DSPOBJD` | Display object description and metadata |
| `QSYS2.OBJECT_STATISTICS` | SQL version of DSPOBJD — queryable, filterable |
| `DSPPGM` | Display program attributes (compiler, source file, modules) |
| `QSYS2.PROGRAM_INFO` | SQL version of DSPPGM |
| `DSPPGMREF` | Display outbound object references from a program |
| `QSYS2.PROGRAM_OBJECT_INFO` | SQL version of DSPPGMREF |
| `ADDLIBLE` | Add a library to the current session's library list |

---

*Last updated for IBM TechXchange 2026 Hackathon demo — IBM i Application Navigator.*
