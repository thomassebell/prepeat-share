// Rendering for the recipe share page. Pure functions, no framework, no npm
// dependencies – so this module runs identically in a Vercel Node function and
// in dev-server.mjs, and can be unit-tested with plain `node`.
//
// Design: docs/sketches/share-page-design.html in the prepeat repo (Claude's,
// reviewed by Thomas 2026-08-17). Rules: docs/share-recipe.md.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// The production Supabase project. NOT SECRETS: the URL and the publishable
// anon key ship inside every copy of the app and inside this page's own
// requests, and 0034 makes sure the anon role can do exactly one thing
// (share_by_token, which needs the token). Defaults live here so the deploy is
// self-contained; the env vars still win, which is how dev-server.mjs points at
// the dev project instead.
export const DEFAULT_SUPABASE_URL = 'https://wfrusfivvnutrtddyhiz.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_V8fwFmiwVCyTlYVS0IpM0w_9MAKb0rj';

const APP_STORE_URL = 'https://apps.apple.com/app/id6793690543';

// Sebell DS, prep-eat brand, light appearance. Mirrored from the app's
// src/constants/ds-theme.cjs exactly as prepeat-web's styles.css does – if the
// DS is retuned, both files need the same edit.
const CSS = `
@font-face{font-family:'Montserrat';src:url('https://prepeat.app/fonts/Montserrat_700Bold.ttf') format('truetype');font-weight:700;font-display:swap}
@font-face{font-family:'IBM Plex Sans';src:url('https://prepeat.app/fonts/IBMPlexSans_400Regular.ttf') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'IBM Plex Sans';src:url('https://prepeat.app/fonts/IBMPlexSans_700Bold.ttf') format('truetype');font-weight:700;font-display:swap}
:root{
  --text-default:#4F4230;--text-subtle:#5F503A;--text-brand:#378112;
  --white:#FFFFFF;--lightest:#F8F7F7;--lighter:#E7E6E4;
  --primary-lightest:#E9FBE0;--primary-light:#83E651;--primary-main:#56C91D;
  --border-subtle:#E7E6E4;
  --layout-xxsmall:4px;--layout-xsmall:8px;--layout-small:16px;--layout-medium:24px;
  --radius-medium:12px;--radius-large:16px;
}
*{box-sizing:border-box}
body{
  margin:0;background:var(--lightest);color:var(--text-default);
  font-family:'IBM Plex Sans',system-ui,sans-serif;line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.sheet{max-width:420px;margin:0 auto;min-height:100vh;background:var(--white);
  display:flex;flex-direction:column}
.brandbar{padding:var(--layout-small);display:flex;justify-content:center;
  border-bottom:1px solid var(--border-subtle)}
.wordmark{font-family:'Montserrat',system-ui,sans-serif;font-weight:700;
  font-size:18px;letter-spacing:-.01em;color:var(--text-default)}
.wordmark span{color:var(--primary-main)}
.sender{padding:var(--layout-small) var(--layout-small) 12px;font-size:15px;
  color:var(--text-subtle)}
.sender b{color:var(--text-default)}
.photo{width:100%;aspect-ratio:402/320;object-fit:cover;display:block;background:var(--lighter)}
/* The generated card, for a recipe whose photo is not ours to publish. Pure CSS
   on the page – no image generation needed here. See the note in the README
   about why the CHAT PREVIEW is a different problem. */
.gencard{aspect-ratio:402/320;padding:var(--layout-medium);
  background:linear-gradient(155deg,var(--primary-light) 0%,var(--primary-main) 100%);
  display:flex;flex-direction:column;justify-content:space-between}
.gencard .mark{font-family:'Montserrat',system-ui,sans-serif;font-weight:700;
  font-size:15px;color:var(--text-default);opacity:.72}
.gencard .t{font-family:'Montserrat',system-ui,sans-serif;font-weight:700;
  font-size:30px;line-height:1.14;color:var(--text-default);text-wrap:balance;margin:0}
.body{padding:var(--layout-small);display:flex;flex-direction:column;
  gap:12px;flex:1}
h1{font-family:'Montserrat',system-ui,sans-serif;font-weight:700;font-size:26px;
  line-height:1.2;margin:0;text-wrap:balance}
.desc{margin:0;font-size:15px;color:var(--text-subtle)}
.times{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0}
.times div{display:flex;gap:5px;font-size:13.5px;white-space:nowrap}
.times dt{margin:0;color:var(--text-subtle)}
.times dd{margin:0;font-weight:700}
.wall{margin-top:4px;background:var(--primary-lightest);border-radius:var(--radius-medium);
  padding:var(--layout-small);display:flex;flex-direction:column;gap:10px}
.wall h2{font-family:'Montserrat',system-ui,sans-serif;font-weight:700;font-size:17px;margin:0}
.wall p{margin:0;font-size:14.5px;color:var(--text-subtle)}
.btn{display:block;text-align:center;text-decoration:none;background:var(--primary-light);
  color:var(--text-default);font-weight:700;font-size:16px;
  border-radius:var(--radius-medium);padding:14px 16px}
.btn:hover{background:#69E12D}
.btn:focus-visible,a:focus-visible{outline:2px solid var(--text-brand);outline-offset:2px}
.alt{text-align:center;font-size:13.5px}
.alt a{color:var(--text-brand);font-weight:700;text-decoration:none}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;padding:48px var(--layout-medium);text-align:center}
.empty .mark{width:56px;height:56px;border-radius:28px;background:var(--lighter);
  display:flex;align-items:center;justify-content:center;
  font-family:'Montserrat',system-ui,sans-serif;font-weight:700;font-size:26px;
  color:var(--text-subtle)}
.empty h1{font-size:21px}
.empty p{margin:0;font-size:14.5px;color:var(--text-subtle);max-width:30ch}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

function layout({ title, ogTags, body, noindex = true }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
${ogTags}
<style>${CSS}</style>
</head>
<body>
<div class="sheet">
${body}
</div>
</body>
</html>`;
}

function brandbar() {
  return `<div class="brandbar"><div class="wordmark">prep<span>+</span>eat</div></div>`;
}

function wall(sharedBy) {
  const who = sharedBy ? `${esc(sharedBy)}&#8217;s` : 'this';
  return `<div class="wall">
  <h2>The recipe is in the app</h2>
  <p>Get Prep+Eat and ${who} recipe is waiting for you &#8211; ingredients, method, the lot. Free.</p>
  <a class="btn" href="${APP_STORE_URL}">Get Prep+Eat</a>
</div>
<p class="alt"><a href="${APP_STORE_URL}">Already have it? Open the recipe</a></p>`;
}

/**
 * Open Graph tags. THESE ARE THE PRODUCT: almost nobody types this URL, they
 * meet it as a card in a chat, and unfurl bots do not run JavaScript – which is
 * the entire reason this page is server-rendered rather than a static file that
 * fetches its own data.
 *
 * og:description is OUR OWN sentence, never the recipe's. An imported recipe's
 * description belongs to the site it came from and is dropped in the database
 * before it ever reaches here, but the rule is restated in code because this is
 * the one place where text becomes public.
 */
function ogTags({ url, title, sharedBy, totalMinutes, imageUrl }) {
  const desc = [
    sharedBy ? `${sharedBy} shared a recipe` : 'A shared recipe',
    totalMinutes ? `${totalMinutes} min` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const tags = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Prep+Eat">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
  ];
  if (imageUrl) {
    tags.push(`<meta property="og:image" content="${esc(imageUrl)}">`);
    tags.push(`<meta name="twitter:card" content="summary_large_image">`);
    tags.push(`<meta name="twitter:image" content="${esc(imageUrl)}">`);
  } else {
    // ⚠️ NO og:image ON PURPOSE, for now. When the photo is not ours to publish
    // there is nothing to point at: an unfurl bot needs a real raster image, and
    // the page's generated title card is CSS, which a bot never renders. So the
    // card falls back to a compact text card – title, our sentence, the domain.
    // Functional, and weaker than it should be. The proper fix is generating the
    // title card as a PNG (satori / @vercel/og); see the README.
    tags.push(`<meta name="twitter:card" content="summary">`);
  }
  return tags.join('\n');
}

const minutes = (n) => (typeof n === 'number' && n > 0 ? n : null);

/** The live page. `share` is a row from Supabase's share_by_token(). */
export function renderShare({ share, url }) {
  const prep = minutes(share.prep_minutes);
  const cook = minutes(share.cook_minutes);
  const total = prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null;

  // Total only earns its place when it is the SUM of two numbers. With just one
  // of prep/cook set - which is most recipes - "Total 30 min  Cook 30 min" says
  // the same thing twice and reads like a bug. Caught on the live page; the
  // local test recipes happened to have both.
  const showTotal = prep != null && cook != null;
  const times = [
    showTotal ? ['Total', total] : null,
    prep != null ? ['Prep', prep] : null,
    cook != null ? ['Cook', cook] : null,
  ]
    .filter(Boolean)
    .map(([label, n]) => `<div><dt>${label}</dt><dd>${n} min</dd></div>`)
    .join('');

  // Own photo → show it. No photo (imported, or never had one) → the generated
  // card, which carries the title, so the page does NOT repeat the title
  // underneath (Thomas, 2026-08-17).
  const hero = share.image_url
    ? `<img class="photo" src="${esc(share.image_url)}" alt="${esc(share.title)}">`
    : // The title is an h1 HERE, not a div, because on this variant the page has
      // no other heading – Thomas's decision drops the separate title when the
      // generated card carries it, and a page with no h1 is a page a screen
      // reader cannot navigate. Every variant ends up with exactly one h1.
      `<div class="gencard"><div class="mark">prep+eat</div><h1 class="t">${esc(share.title)}</h1></div>`;

  const body = `${brandbar()}
${share.shared_by ? `<div class="sender"><b>${esc(share.shared_by)}</b> shared a recipe with you</div>` : ''}
${hero}
<div class="body">
  ${share.image_url ? `<h1>${esc(share.title)}</h1>` : ''}
  ${share.description ? `<p class="desc">${esc(share.description)}</p>` : ''}
  ${times ? `<dl class="times">${times}</dl>` : ''}
  ${wall(share.shared_by)}
</div>`;

  return layout({
    title: `${share.title} – Prep+Eat`,
    ogTags: ogTags({
      url,
      title: share.title,
      sharedBy: share.shared_by,
      totalMinutes: total,
      imageUrl: share.image_url,
    }),
    body,
  });
}

/**
 * Revoked, or the recipe was deleted. We still have the row, so we still know
 * who shared it – which is why this can name them and stay warm instead of
 * reading as an error. Deliberately different from notFound() below.
 */
export function renderRevoked({ share, url }) {
  const who = share.shared_by ? esc(share.shared_by) : 'Whoever sent this';
  const body = `${brandbar()}
<div class="empty">
  <div class="mark">+</div>
  <h1>${who} isn&#8217;t sharing this one any more</h1>
  <p>The link has been turned off. Ask ${share.shared_by ? 'them' : 'them'} for a new one &#8211; it takes a second.</p>
  <a class="btn" href="${APP_STORE_URL}">See what Prep+Eat is</a>
</div>`;
  return layout({
    title: 'Not shared any more – Prep+Eat',
    ogTags: ogTags({ url, title: 'Prep+Eat', sharedBy: null, totalMinutes: null }),
    body,
  });
}

/**
 * No row at all: a mistyped or truncated token. We know NOTHING – not even who
 * sent it – so this must stay generic. That is a real difference from revoked,
 * not a shortcut.
 */
export function renderNotFound({ url }) {
  const body = `${brandbar()}
<div class="empty">
  <div class="mark">+</div>
  <h1>This link doesn&#8217;t lead anywhere</h1>
  <p>It may have been mistyped or cut short. Ask whoever sent it to share it again.</p>
  <a class="btn" href="${APP_STORE_URL}">See what Prep+Eat is</a>
</div>`;
  return layout({
    title: 'Link not found – Prep+Eat',
    ogTags: ogTags({ url, title: 'Prep+Eat', sharedBy: null, totalMinutes: null }),
    body,
  });
}

/** Something broke on our side. Never blames the reader. */
export function renderError({ url }) {
  const body = `${brandbar()}
<div class="empty">
  <div class="mark">+</div>
  <h1>We can&#8217;t load this right now</h1>
  <p>Something went wrong at our end. Try again in a moment.</p>
  <a class="btn" href="${APP_STORE_URL}">See what Prep+Eat is</a>
</div>`;
  return layout({
    title: 'Prep+Eat',
    ogTags: ogTags({ url, title: 'Prep+Eat', sharedBy: null, totalMinutes: null }),
    body,
  });
}

/**
 * Ask Supabase what is behind a token.
 *
 * Uses the ANON key and `share_by_token`, which is the only thing anon may do:
 * it takes the token as an argument, so there is nothing to enumerate, and the
 * table itself is unreadable to anon (migration 0034). This host therefore needs
 * NO service-role key and holds no secret worth stealing.
 */
export async function fetchShare({ supabaseUrl, anonKey, token }) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/share_by_token`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) throw new Error(`share_by_token failed: ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** Route one request. Returns { status, html, cacheControl }. */
export async function handleShareRequest({ token, url, supabaseUrl, anonKey }) {
  // A token is 32 hex chars (gen_random_uuid with the dashes taken out). Reject
  // anything else before spending a database round trip on it.
  if (typeof token !== 'string' || !/^[0-9a-f]{32}$/.test(token)) {
    return { status: 404, html: renderNotFound({ url }), cacheControl: 'public, max-age=300' };
  }
  let share;
  try {
    share = await fetchShare({ supabaseUrl, anonKey, token });
  } catch (err) {
    console.error('[share] lookup failed', err);
    return { status: 503, html: renderError({ url }), cacheControl: 'no-store' };
  }
  if (share == null) {
    return { status: 404, html: renderNotFound({ url }), cacheControl: 'public, max-age=300' };
  }
  if (share.status !== 'live') {
    // Not cached: a revoked link must stop working promptly, and revocation is
    // the only safety valve a sharer has.
    return { status: 410, html: renderRevoked({ share, url }), cacheControl: 'no-store' };
  }
  // Short cache: the snapshot never changes, but revocation must take effect
  // quickly, and an unfurl bot plus the reader are usually two hits seconds
  // apart.
  return { status: 200, html: renderShare({ share, url }), cacheControl: 'public, max-age=60' };
}
