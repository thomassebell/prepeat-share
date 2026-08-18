// Vercel Node function. Serves /r/<token> via the rewrite in vercel.json.
//
// Deliberately thin: everything real lives in lib/render.mjs so it can run
// unchanged under dev-server.mjs and be tested with plain node.

import {
  handleShareRequest,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '../../lib/render.mjs';

export default async function handler(req, res) {
  const token = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'share.prepeat.app';
  const url = `https://${host}/r/${token ?? ''}`;

  const { status, html, cacheControl } = await handleShareRequest({
    token,
    url,
    supabaseUrl: process.env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  // The page embeds only its own CSS and one image from Supabase storage.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https://prepeat.app; base-uri 'none'; form-action 'none'",
  );
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).send(html);
}
