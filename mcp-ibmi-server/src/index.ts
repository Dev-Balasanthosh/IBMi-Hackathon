import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  loadConfig,
  checkConnection,
  runCommand,
  runSql,
} from './ssh-client.js';

const server = new McpServer({
  name: 'ibmi',
  version: '1.1.0',
});

// ---------------------------------------------------------------------------
// Tool 1 — check_connection
// TCP probe only — does not authenticate. Returns reachable: true/false.
// ---------------------------------------------------------------------------
server.tool(
  'check_connection',
  'Check whether the IBM i PUB400 server is reachable over TCP. Does not authenticate.',
  {},
  async () => {
    try {
      const config = loadConfig();
      const result = await checkConnection(config);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ reachable: false, error: (err as Error).message }),
        }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool 2 — get_library_list
// Returns the effective library list via QSYS2.LIBRARY_LIST_INFO.
// ---------------------------------------------------------------------------
server.tool(
  'get_library_list',
  'Return the IBM i effective library list ordered by position. Uses QSYS2.LIBRARY_LIST_INFO.',
  {},
  async () => {
    try {
      const config = loadConfig();
      const sql = `
        SELECT ORDINAL_POSITION, SYSTEM_LIBRARY_NAME AS library,
               TYPE AS type, LIBRARY_TEXT AS description
        FROM QSYS2.LIBRARY_LIST_INFO
        ORDER BY ORDINAL_POSITION
      `;
      const result = await runSql(config, sql.trim().replace(/\s+/g, ' '));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool 3 — discover_object
// Finds IBM i objects by name using QSYS2.OBJECT_STATISTICS.
// Returns all matching objects across all libraries (handles multiple matches).
// ---------------------------------------------------------------------------
server.tool(
  'discover_object',
  'Find IBM i object(s) by name using QSYS2.OBJECT_STATISTICS. Returns all library matches.',
  {
    object_name: z.string().max(10).describe('IBM i object name to search for (max 10 chars, case-insensitive)'),
    object_type: z.string().optional().describe('Optional IBM i object type filter e.g. *PGM, *FILE'),
  },
  async ({ object_name, object_type }) => {
    try {
      const config = loadConfig();
      const nameUpper = object_name.toUpperCase();
      const typeClause = object_type ? ` AND OBJTYPE = '${object_type.toUpperCase()}'` : '';
      const sql = `
        SELECT OBJNAME AS object_name, OBJLONGSCHEMA AS library, OBJTYPE AS object_type,
               OBJTEXT AS text_description, OBJCREATED AS creation_date,
               LAST_CHANGED_TIMESTAMP AS last_change_date, OBJSIZE AS object_size,
               OBJATTRIBUTE AS attribute
        FROM QSYS2.OBJECT_STATISTICS
        WHERE OBJNAME = '${nameUpper}'${typeClause}
      `;
      const result = await runSql(config, sql.trim().replace(/\s+/g, ' '));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool 4 — get_program_info
// Returns source file, source member, compiler, and bound modules for a program.
// Uses QSYS2.PROGRAM_INFO.
// ---------------------------------------------------------------------------
server.tool(
  'get_program_info',
  'Return source file, source member, compiler, and bound module info for an IBM i *PGM object.',
  {
    program_name: z.string().max(10).describe('Program name (max 10 chars)'),
    program_library: z.string().max(10).describe('Library containing the program'),
  },
  async ({ program_name, program_library }) => {
    try {
      const config = loadConfig();
      const sql = `
        SELECT PROGRAM_NAME AS program_name, PROGRAM_LIBRARY AS program_library,
               SOURCE_FILE AS source_file, SOURCE_LIBRARY AS source_library,
               SOURCE_MEMBER AS source_member, PROGRAM_TYPE AS compiler,
               CREATION_DATE AS creation_date, LAST_USED_TIMESTAMP AS last_change_date,
               TARGET_RELEASE AS target_release
        FROM QSYS2.PROGRAM_INFO
        WHERE PROGRAM_NAME = '${program_name.toUpperCase()}'
          AND PROGRAM_LIBRARY = '${program_library.toUpperCase()}'
      `;
      const result = await runSql(config, sql.trim().replace(/\s+/g, ' '));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool 5 — get_program_refs
// Returns outbound object references for a program using DSPPGMREF via SSH.
// Falls back to QSYS2.PROGRAM_OBJECT_INFO if available.
// ---------------------------------------------------------------------------
server.tool(
  'get_program_refs',
  'Return outbound object references for an IBM i program using DSPPGMREF.',
  {
    program_name: z.string().max(10).describe('Program name'),
    program_library: z.string().max(10).describe('Library containing the program'),
  },
  async ({ program_name, program_library }) => {
    try {
      const config = loadConfig();
      // Use QSYS2.PROGRAM_OBJECT_INFO for structured output
      const sql = `
        SELECT PROGRAM_NAME AS from_object, PROGRAM_LIBRARY AS from_library,
               BOUND_OBJECT_NAME AS to_object, BOUND_OBJECT_LIBRARY AS to_library,
               BOUND_OBJECT_TYPE AS to_type, BINDING_ATTRIBUTE AS usage
        FROM QSYS2.PROGRAM_OBJECT_INFO
        WHERE PROGRAM_NAME = '${program_name.toUpperCase()}'
          AND PROGRAM_LIBRARY = '${program_library.toUpperCase()}'
      `;
      const result = await runSql(config, sql.trim().replace(/\s+/g, ' '));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      // Graceful fallback: try DSPPGMREF command
      try {
        const config = loadConfig();
        const cmd = `system "DSPPGMREF PGM(${program_library.toUpperCase()}/${program_name.toUpperCase()}) OUTPUT(*PRINT)"`;
        const result = await runCommand(config, cmd);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (fallbackErr) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: (fallbackErr as Error).message }),
          }],
        };
      }
    }
  }
);

// ---------------------------------------------------------------------------
// Tool 6 — execute_ibmi_command
// Generic CL/SQL passthrough. Runs any command via SSH and returns
// stdout, stderr, and exit_code. Use for commands not covered by specific tools.
// ---------------------------------------------------------------------------
server.tool(
  'execute_ibmi_command',
  'Execute any IBM i CL command or SQL statement over SSH. Returns stdout, stderr, exit_code.',
  {
    command: z.string().describe('The IBM i CL command or system() call to execute'),
  },
  async ({ command }) => {
    try {
      const config = loadConfig();
      const result = await runCommand(config, command);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool 7 — search_source
// Search for source members by name or pattern across source physical files.
// Uses QSYS2.SYSPARTITIONSTAT or QSYS2.SYSTABLES as a catalog of source files,
// then searches member names. Falls back to WRKMBRPDM-style catalog query.
// ---------------------------------------------------------------------------
server.tool(
  'search_source',
  'Search for IBM i source members by name or pattern across source physical files in a library.',
  {
    member_name:    z.string().describe('Source member name or pattern (use % as wildcard, e.g. CUST% or CUSTUPD)'),
    source_library: z.string().max(10).describe('Library to search in (e.g. QGPL, BALA981)'),
    source_file:    z.string().max(10).optional().describe('Optional: specific source file to search (e.g. QRPGLESRC). Omit to search all source files.'),
  },
  async ({ member_name, source_library, source_file }) => {
    try {
      const config = loadConfig();
      const lib    = source_library.toUpperCase();
      const mbr    = member_name.toUpperCase();
      const fileClause = source_file
        ? `AND TABLE_NAME = '${source_file.toUpperCase()}'`
        : '';

      // Query QSYS2.SYSTABLES for source physical file members
      const sql = `
        SELECT TABLE_SCHEMA AS source_library,
               TABLE_NAME   AS source_file,
               TABLE_PARTITION AS source_member,
               PARTITION_TEXT  AS member_text,
               CREATE_TIMESTAMP AS creation_date,
               LAST_ALTERED_TIMESTAMP AS last_change_date,
               NUMBER_ROWS AS source_lines
        FROM QSYS2.SYSPARTITIONSTAT
        WHERE TABLE_SCHEMA = '${lib}'
          AND TABLE_PARTITION LIKE '${mbr}'
          ${fileClause}
        ORDER BY TABLE_NAME, TABLE_PARTITION
      `;
      const result = await runSql(config, sql.trim().replace(/\s+/g, ' '));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (err as Error).message }) }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Start the server on stdio transport
// ---------------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is reserved for MCP protocol messages
  process.stderr.write('IBM i MCP Server started (stdio transport)\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
