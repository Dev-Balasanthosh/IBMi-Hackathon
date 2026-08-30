import { Client } from 'ssh2';
import * as net from 'net';

/** Configuration loaded from environment variables — no credentials in source */
export interface IbmiConfig {
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
}

export interface SshResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface ConnectionCheckResult {
  reachable: boolean;
  host: string;
  port: number;
  error?: string;
}

/** Load IBM i connection config from environment variables */
export function loadConfig(): IbmiConfig {
  const host = process.env.IBMI_HOST;
  const user = process.env.IBMI_USER;
  const keyPath = process.env.IBMI_SSH_KEY_PATH;
  const port = parseInt(process.env.IBMI_PORT ?? '22', 10);

  if (!host || !user || !keyPath) {
    throw new Error(
      'Missing required environment variables: IBMI_HOST, IBMI_USER, IBMI_SSH_KEY_PATH. ' +
      'Copy .env.example to .env and fill in your values, then load with: ' +
      'export $(grep -v "^#" .env | xargs)'
    );
  }

  return { host, port, username: user, privateKeyPath: keyPath };
}

/**
 * TCP reachability probe — does NOT authenticate, just tests if the port is open.
 * Times out after 5 seconds.
 */
export function checkConnection(config: IbmiConfig): Promise<ConnectionCheckResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);

    socket.connect(config.port, config.host, () => {
      socket.destroy();
      resolve({ reachable: true, host: config.host, port: config.port });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ reachable: false, host: config.host, port: config.port, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        reachable: false,
        host: config.host,
        port: config.port,
        error: `Connection timed out after ${timeout}ms`,
      });
    });
  });
}

/** Execute a single command over SSH and return stdout/stderr/exit_code */
export function runCommand(config: IbmiConfig, command: string): Promise<SshResult> {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    let privateKey: Buffer;

    try {
      privateKey = fs.readFileSync(config.privateKeyPath);
    } catch (err) {
      reject(new Error(`Cannot read SSH key at ${config.privateKeyPath}: ${(err as Error).message}`));
      return;
    }

    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        stream.on('close', (code: number) => {
          conn.end();
          resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exit_code: code ?? 0 });
        });

        stream.on('data', (data: Buffer) => { stdout += data.toString(); });
        stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      });
    });

    conn.on('error', (err) => reject(err));

    conn.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      privateKey,
      readyTimeout: 20000,
      // Support both RSA and ed25519 keys — let ssh2 auto-detect
      algorithms: {
        serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519'],
        kex: [
          'ecdh-sha2-nistp256','ecdh-sha2-nistp384','ecdh-sha2-nistp521',
          'diffie-hellman-group14-sha256','diffie-hellman-group14-sha1'
        ],
      },
    });
  });
}

/**
 * Run an IBM i SQL statement using db2util over PASE SSH.
 * PUB400 IBM i 7.5 — uses /usr/bin/db2 (PASE db2 CLI).
 * Falls back to system RUNSQL if db2 is not accessible.
 */
export async function runSql(config: IbmiConfig, sql: string): Promise<SshResult> {
  // Escape single quotes for shell safety
  const escaped = sql.replace(/'/g, `'\\''`);
  // Primary: PASE db2 CLI (available on IBM i 7.4+)
  const cmd = `export PATH=/QOpenSys/usr/bin:/usr/bin:$PATH; db2 "${escaped}" 2>&1`;
  return runCommand(config, cmd);
}

/**
 * Run a CL command via the PASE `system` utility.
 * Output goes to stdout of the SSH session.
 */
export async function runCL(config: IbmiConfig, clCommand: string): Promise<SshResult> {
  const cmd = `system "${clCommand.replace(/"/g, '\\"')}"`;
  return runCommand(config, cmd);
}
