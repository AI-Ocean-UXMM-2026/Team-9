import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  appDataSchema,
  emptyAppData,
  isValidTimeZone,
} from '../src/domain/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, '.data'));
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'fintech.sqlite'));
db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS records (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, payload TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);`);
db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
const derive = promisify(scrypt);
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const port = Number(process.env.API_PORT || 3001);
const host = process.env.API_HOST || '127.0.0.1';
const allowedOrigins = new Set(
  (
    process.env.APP_ORIGIN ||
    'http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3001,http://localhost:3001'
  )
    .split(',')
    .map((value) => value.trim()),
);
const secure = process.env.NODE_ENV === 'production';
function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  // Vite may choose another local port when one is occupied; preview uses 4173.
  // Production continues to require an explicitly allowed origin.
  if (secure) return false;
  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      ['http:', 'https:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
const cookie = (value: string, maxAge: number) =>
  `fintech_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase().trim());
const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});
const recordsSchema = z.object({
  userId: z.string(),
  data: appDataSchema,
  timeZone: z.string().refine(isValidTimeZone),
});
interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
}
const publicUser = ({ id, name, email }: UserRow) => ({ id, name, email });
const rates = new Map<string, { count: number; end: number }>();
let hashing = 0;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function reply(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage, limit = 8192): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json'))
    throw new HttpError(415, 'Use a JSON request.');
  let length = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw new HttpError(413, 'This request is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Check the submitted information.');
  }
}
function limited(req: IncomingMessage, key: string, maximum = 15) {
  const id = `${req.socket.remoteAddress}:${key}`;
  const now = Date.now();
  if (rates.size > 5000)
    for (const [item, rate] of rates) if (rate.end <= now) rates.delete(item);
  const rate = rates.get(id);
  if (!rate || rate.end <= now) {
    rates.set(id, { count: 1, end: now + 15 * 60_000 });
    return;
  }
  if (++rate.count > maximum)
    throw new HttpError(
      429,
      'Too many attempts. Please try again in 15 minutes.',
    );
}
function sessionToken(req: IncomingMessage) {
  return (
    (req.headers.cookie || '')
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('fintech_session='))
      ?.slice('fintech_session='.length) ?? ''
  );
}
function currentUser(req: IncomingMessage): UserRow | undefined {
  const token = sessionToken(req);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  return db
    .prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
    )
    .get(hashToken(token), Date.now()) as unknown as UserRow | undefined;
}
function beginSession(
  req: IncomingMessage,
  res: ServerResponse,
  user: UserRow,
) {
  const previous = sessionToken(req);
  if (previous)
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
      hashToken(previous),
    );
  const token = randomBytes(32).toString('base64url');
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
  ).run(hashToken(token), user.id, Date.now() + 7 * 86_400_000);
  res.setHeader('Set-Cookie', cookie(token, 7 * 86400));
}
async function passwordHash(password: string, salt: string) {
  if (hashing >= 4)
    throw new HttpError(429, 'The server is busy. Please try again shortly.');
  hashing++;
  try {
    return (await derive(password, salt, 64)) as Buffer;
  } finally {
    hashing--;
  }
}
async function authenticatedPassword(
  user: UserRow | undefined,
  password: string,
) {
  const derived = await passwordHash(
    password,
    user?.salt ?? 'unknown-account-timing-salt',
  );
  const stored = user
    ? Buffer.from(user.password_hash, 'hex')
    : Buffer.alloc(64);
  return Boolean(
    user &&
    stored.length === derived.length &&
    timingSafeEqual(stored, derived),
  );
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  const route = new URL(req.url || '/', 'http://localhost').pathname;
  try {
    if (route.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method || '')) {
        if (!isAllowedOrigin(req.headers.origin))
          throw new HttpError(403, 'This request origin is not allowed.');
        if (req.headers['sec-fetch-site'] === 'cross-site')
          throw new HttpError(403, 'This request origin is not allowed.');
      }
      if (route === '/api/health' && req.method === 'GET') {
        reply(res, 200, { status: 'ok', service: 'fintech-auth' });
        return;
      }
      if (route === '/api/auth/session' && req.method === 'GET') {
        const user = currentUser(req);
        reply(res, 200, { user: user ? publicUser(user) : null });
        return;
      }
      if (route === '/api/auth/register' && req.method === 'POST') {
        limited(req, 'auth');
        const parsed = registerSchema.safeParse(await body(req));
        if (!parsed.success)
          throw new HttpError(
            400,
            'Enter your name, a valid email and a password of at least 8 characters.',
          );
        const { name, email, password } = parsed.data;
        const salt = randomBytes(16).toString('hex');
        const password_hash = (await passwordHash(password, salt)).toString(
          'hex',
        );
        const user: UserRow = {
          id: randomUUID(),
          name,
          email,
          salt,
          password_hash,
        };
        try {
          db.prepare(
            'INSERT INTO users (id, name, email, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ).run(
            user.id,
            name,
            email,
            salt,
            password_hash,
            new Date().toISOString(),
          );
        } catch (error) {
          if (String(error).includes('UNIQUE'))
            throw new HttpError(
              409,
              'An account already uses this email. Please sign in.',
            );
          throw error;
        }
        beginSession(req, res, user);
        reply(res, 201, { user: publicUser(user) });
        return;
      }
      if (route === '/api/auth/login' && req.method === 'POST') {
        limited(req, 'auth');
        const parsed = credentialsSchema.safeParse(await body(req));
        if (!parsed.success)
          throw new HttpError(400, 'Enter a valid email and password.');
        const user = db
          .prepare('SELECT * FROM users WHERE email = ?')
          .get(parsed.data.email) as unknown as UserRow | undefined;
        if (!(await authenticatedPassword(user, parsed.data.password)))
          throw new HttpError(401, 'The email or password is incorrect.');
        beginSession(req, res, user!);
        reply(res, 200, { user: publicUser(user!) });
        return;
      }
      if (route === '/api/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
          hashToken(sessionToken(req)),
        );
        res.setHeader('Set-Cookie', cookie('', 0));
        reply(res, 200, { ok: true });
        return;
      }
      const user = currentUser(req);
      if (!user) throw new HttpError(401, 'Please sign in to continue.');
      if (route === '/api/auth/profile' && req.method === 'PATCH') {
        limited(req, 'profile');
        const parsed = z
          .object({
            name: z.string().trim().min(1).max(100),
            email: emailSchema,
            currentPassword: z.string().max(128).optional(),
          })
          .safeParse(await body(req));
        if (!parsed.success)
          throw new HttpError(
            400,
            'Enter your name and a valid email address.',
          );
        const { name, email, currentPassword } = parsed.data;
        const emailChanged = email !== user.email;
        if (
          emailChanged &&
          !(await authenticatedPassword(user, currentPassword || ''))
        )
          throw new HttpError(
            401,
            'Enter your current password to change your email.',
          );
        try {
          db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(
            name,
            email,
            user.id,
          );
        } catch (error) {
          if (String(error).includes('UNIQUE'))
            throw new HttpError(
              409,
              'An account already uses this email address.',
            );
          throw error;
        }
        const updated = { ...user, name, email };
        if (emailChanged) {
          db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
          beginSession(req, res, updated);
        }
        reply(res, 200, { user: publicUser(updated) });
        return;
      }
      if (route === '/api/records' && req.method === 'GET') {
        const row = db
          .prepare('SELECT payload FROM records WHERE user_id = ?')
          .get(user.id) as { payload: string } | undefined;
        reply(
          res,
          200,
          row
            ? JSON.parse(row.payload)
            : { data: emptyAppData(), timeZone: 'Asia/Rangoon', empty: true },
        );
        return;
      }
      if (route === '/api/records' && req.method === 'PUT') {
        limited(req, 'records', 600);
        const parsed = recordsSchema.safeParse(
          await body(req, 8 * 1024 * 1024),
        );
        if (!parsed.success || parsed.data.userId !== user.id)
          throw new HttpError(400, 'The saved records could not be validated.');
        const { data, timeZone } = parsed.data;
        db.prepare(
          'INSERT INTO records (user_id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',
        ).run(
          user.id,
          JSON.stringify({ data, timeZone }),
          new Date().toISOString(),
        );
        reply(res, 200, { ok: true });
        return;
      }
      if (route === '/api/auth/account' && req.method === 'DELETE') {
        limited(req, 'auth');
        const parsed = z
          .object({ password: z.string().min(1).max(128) })
          .safeParse(await body(req));
        if (
          !parsed.success ||
          !(await authenticatedPassword(user, parsed.data.password))
        )
          throw new HttpError(
            401,
            'Enter your current password to delete this account.',
          );
        db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
        res.setHeader('Set-Cookie', cookie('', 0));
        reply(res, 200, { ok: true });
        return;
      }
      throw new HttpError(404, 'This endpoint was not found.');
    }
    if (!['GET', 'HEAD'].includes(req.method || ''))
      throw new HttpError(405, 'Method not allowed.');
    const dist = path.join(root, 'dist');
    const relative = decodeURIComponent(route === '/' ? '/index.html' : route);
    const target = path.resolve(dist, `.${relative}`);
    if (
      !target.startsWith(`${dist}${path.sep}`) ||
      relative.split('/').some((part) => part.startsWith('.'))
    )
      throw new HttpError(404, 'Not found.');
    if (!statSync(target).isFile()) throw new HttpError(404, 'Not found.');
    const mime: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.woff2': 'font/woff2',
      '.wasm': 'application/wasm',
      '.gz': 'application/gzip',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    };
    res.writeHead(200, {
      'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': target.endsWith('index.html')
        ? 'no-store'
        : 'public, max-age=86400',
    });
    res.end(req.method === 'HEAD' ? undefined : readFileSync(target));
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    if (error instanceof HttpError) {
      reply(res, error.status, { error: error.message });
      return;
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      reply(res, 404, {
        error: 'Page not found. Build the app before starting production mode.',
      });
      return;
    }
    // Never log credentials, cookies, financial payloads or database contents.
    console.error('An API request failed.');
    reply(res, 500, {
      error: 'The server could not complete this request. Please try again.',
    });
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.listen(port, host, () =>
  console.log(`Account backend ready at http://${host}:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
