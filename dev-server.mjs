// Local server for reviewing the share page without deploying anything.
// Runs the SAME lib/render.mjs the Vercel function uses, so what you see here is
// what would ship.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node dev-server.mjs
//   open http://localhost:8790/r/<token>
//
// Reads the DEV Supabase by default when you pass the dev values, so tokens
// created by the dev app on Thomas's phone resolve here.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { handleShareRequest } from './lib/render.mjs';

const PORT = Number(process.env.PORT ?? 8790);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  process.exit(1);
}

const MIME = { '.ttf': 'font/ttf', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain' };

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  // Static assets out of public/, the same paths Vercel would serve.
  if (pathname.startsWith('/fonts/')) {
    try {
      const file = await readFile(join(process.cwd(), 'public', pathname));
      res.setHeader('Content-Type', MIME[extname(pathname)] ?? 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.end(file);
      return;
    } catch {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
  }

  const match = pathname.match(/^\/r\/([^/]*)$/);
  if (!match) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Try /r/<token>');
    return;
  }

  const { status, html, cacheControl } = await handleShareRequest({
    token: decodeURIComponent(match[1]),
    url: `http://localhost:${PORT}${pathname}`,
    supabaseUrl: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  });

  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.end(html);
}).listen(PORT, () => {
  console.log(`share host on http://localhost:${PORT}/r/<token>  (${SUPABASE_URL})`);
});
