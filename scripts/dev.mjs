import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = [];
function start(args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  child.on('exit', (code) => {
    if (code && !closing) {
      stop();
      process.exitCode = code;
    }
  });
  return child;
}
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
}
let running = false;
try {
  const result = await fetch(
    `http://127.0.0.1:${process.env.API_PORT || 3001}/api/health`,
    { signal: AbortSignal.timeout(1000) },
  );
  running = (await result.json()).service === 'fintech-auth';
} catch {
  /* Start our backend below. */
}
if (!running) start(['--import=tsx', '--watch', 'server/index.ts']);
start([
  'node_modules/vite/bin/vite.js',
  '--host',
  '127.0.0.1',
  ...process.argv.slice(2),
]);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
