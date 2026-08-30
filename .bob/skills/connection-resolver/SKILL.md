---
name: IBM i Connection Resolver
description: Use this skill to check whether the IBM i PUB400 server is reachable and determine if live or fallback mode should be used. Activate when a developer asks about IBM i connectivity, server availability, or wants to know whether the live system is accessible before starting an investigation.
---

# IBM i Connection Resolver

This skill checks whether the IBM i PUB400 environment is reachable and sets the execution mode for the current session.

## When to Use

Activate this skill when the developer asks:
- "Is IBM i available?"
- "Can you connect to PUB400?"
- "Is the live server up?"
- "Check IBM i connectivity"
- "What mode are we in — live or fallback?"

## Steps

### Step 1 — Attempt Connection Check

Call the MCP tool `check_connection` (no parameters required).

This tool performs a TCP probe against the configured IBM i host and port. It does **not** authenticate — it only tests whether the port is open. Credentials remain inside the MCP server process and are never echoed or logged.

### Step 2 — Evaluate the Result

**If `reachable: true`:**

Display:
```
🟢 LIVE IBM i — pub400.com
Connection: Confirmed reachable on port 22
Mode: LIVE — all investigation steps will use live IBM i data via SSH
```

**If `reachable: false` or any error:**

Display:
```
🟡 LOCAL FALLBACK — demo dataset active
Reason: [error message from check_connection result]
Mode: FALLBACK — investigation will use the local demo dataset in demo-data/
```

### Step 3 — Report and Stop

This skill's job is connection checking only. Report the result clearly and stop.

If the developer wants a full program investigation, suggest activating the **IBM i Application Navigator** skill instead.

## Security Notes

- Credentials (`IBMI_HOST`, `IBMI_USER`, `IBMI_SSH_KEY_PATH`, `IBMI_PORT`) are read by the MCP server from environment variables only
- Never echo, log, or display credential values
- Never ask the developer to provide a password in chat
