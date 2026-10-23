import { createServer } from 'node:http';
import handler from './handler.js';
import { db } from './database.js';

const port = Number(process.env.API_PORT || process.env.PORT || 3001);
const host = process.env.API_HOST || '127.0.0.1';
await db.ready();
const server = createServer(handler);
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.listen(port, host, () =>
  console.log(`Account backend ready at http://${host}:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
