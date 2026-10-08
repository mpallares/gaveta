// Tiny static server for the Playwright fixture page. No dependencies.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.argv[2] ?? 4173);
const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixture-page');

createServer(async (req, res) => {
  const path = req.url === '/' || req.url === undefined ? '/index.html' : req.url.split('?')[0];
  try {
    const body = await readFile(join(dir, path));
    res.writeHead(200, {
      'content-type': path.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`fixture page on http://127.0.0.1:${port}`);
});
