import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const destination = new URL('../public/ocr/', import.meta.url);
const tesseract = path.dirname(require.resolve('tesseract.js/package.json'));
const core = path.dirname(require.resolve('tesseract.js-core/package.json'));
await Promise.all(
  ['core', 'lang'].map((folder) =>
    mkdir(new URL(folder, destination), { recursive: true }),
  ),
);
await copyFile(
  path.join(tesseract, 'dist/worker.min.js'),
  new URL('worker.min.js', destination),
);
await copyFile(
  path.join(tesseract, 'LICENSE.md'),
  new URL('LICENSE-tesseract.md', destination),
);
for (const name of await readdir(core)) {
  if (/^tesseract-core.*\.(?:wasm|js)$/.test(name))
    await copyFile(path.join(core, name), new URL(`core/${name}`, destination));
}
for (const language of ['eng', 'mya']) {
  const root = path.dirname(
    require.resolve(`@tesseract.js-data/${language}/package.json`),
  );
  await copyFile(
    path.join(root, '4.0.0_best_int', `${language}.traineddata.gz`),
    new URL(`lang/${language}.traineddata.gz`, destination),
  );
}
process.stdout.write('Local OCR assets prepared.\n');
