import { neon } from '@neondatabase/serverless';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const schema = [
  'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS records (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, payload TEXT NOT NULL, updated_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)',
  'CREATE TABLE IF NOT EXISTS request_limits (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at BIGINT NOT NULL)',
];
let local: import('node:sqlite').DatabaseSync | undefined;
const sql = connectionString ? neon(connectionString) : undefined;
let initialization: Promise<void> | undefined;

async function initialize() {
  if (sql) {
    await sql.transaction(schema.map((statement) => sql.query(statement, [])));
    await sql.query('DELETE FROM sessions WHERE expires_at <= $1', [
      Date.now(),
    ]);
  } else {
    if (process.env.VERCEL)
      throw new Error('Connect a Neon database before deploying the API.');
    const { DatabaseSync } = await import('node:sqlite');
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
    );
    const dataDir = path.resolve(
      process.env.DATA_DIR || path.join(root, '.data'),
    );
    mkdirSync(dataDir, { recursive: true });
    local = new DatabaseSync(path.join(dataDir, 'fintech.sqlite'));
    local.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    for (const statement of schema) local.exec(statement);
    local.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  }
}

export const db = {
  ready() {
    return (initialization ??= initialize().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    }));
  },
  prepare(statement: string) {
    // Only fixed, application-owned SQL uses this placeholder conversion.
    let position = 0;
    const postgresStatement = statement.replace(/\?/g, () => `$${++position}`);
    return {
      async get(...values: (string | number)[]) {
        await db.ready();
        if (sql) return (await sql.query(postgresStatement, values))[0];
        return local!.prepare(statement).get(...values);
      },
      async run(...values: (string | number)[]) {
        await db.ready();
        if (sql) await sql.query(postgresStatement, values);
        else local!.prepare(statement).run(...values);
      },
    };
  },
  close() {
    local?.close();
  },
};
