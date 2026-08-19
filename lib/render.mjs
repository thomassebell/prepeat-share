// Rendering for the recipe share page.
//
// ⚠️ EVERY PIECE OF UI HERE IS A DESIGN SYSTEM COMPONENT (Thomas, 2026-08-18:
// *"When building web stuff you should always use the DS components – they are
// there for that reason."*). Button, Text and Stack come from `@sebellds/react`;
// nothing on this page hand-rolls a button or a type style. The only CSS this
// file owns is PAGE LAYOUT – the shell, the card, the image ratio – which is
// this page's own composition and not a component anyone else would reuse. Even
// that is written in DS tokens, never raw values.
//
// This replaced a hand-written HTML string renderer on 2026-08-18. That version
// worked and looked close, and it was still wrong: a copied button gets none of
// the six interaction states, none of the token bindings DS CI checks, and it
// drifts silently the moment the DS is retuned.
//
// Design: Figma sections "recipe – shared site mobile" (726:8992) and
// "recipe – shared site desktop" (726:10982). Rules: docs/share-recipe.md.
//
// Rendered with renderToStaticMarkup and NO BUILD STEP for the JSX, because
// there is no JSX - `h()` is React.createElement. The one build step is
// scripts/build-css.mjs, which bakes the DS stylesheets into an importable
// module (see the note there for why fs-at-runtime is not an option).

import { createElement as h, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Stack, Text } from '@sebellds/react';

import { accessTime, heartBroken, restaurantMenu, whatshot } from './icons.mjs';

import { DS_CSS, DS_VERSIONS } from './ds-css.mjs';

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

// The DEV project, for share-dev.prepeat.app. Also not a secret: this exact key
// ships inside the Prep+Eat Dev app on the phone.
export const DEV_SUPABASE_URL = 'https://rulasawjdtymovobrovv.supabase.co';
export const DEV_SUPABASE_ANON_KEY = 'sb_publishable_1yzTvAN6TKKvbCHWCYMu8A_BJEktVv8';

/**
 * Which database a request is asking about, decided by the HOST it arrived on.
 *
 * ⚠️ WHY THIS EXISTS. The dev app writes shares to the DEV database, while this
 * host read PRODUCTION - so a link made on the phone 404'd on the web, and a
 * production link said "This link doesn't lead anywhere" IN the app. Both were
 * correct answers to the question being asked, and both looked exactly like
 * bugs (2026-08-18, twice, before anyone worked out why).
 *
 * One deployment serves both domains rather than a second project: two projects
 * of the same code drift, and the only difference here is two constants.
 */
export function credentialsFor(host) {
  const dev = typeof host === 'string' && host.startsWith('share-dev.');
  return dev
    ? { supabaseUrl: DEV_SUPABASE_URL, anonKey: DEV_SUPABASE_ANON_KEY }
    : { supabaseUrl: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
}

const APP_STORE_URL = 'https://apps.apple.com/app/id6793690543';

/**
 * PAGE LAYOUT ONLY. Everything visual that a component could own is a
 * component; this is the shell those components sit in.
 *
 * Written entirely in DS tokens. A raw px here would be exactly the drift the
 * component rule exists to stop, one layer down.
 *
 * The phone and desktop frames are the same layout at two widths: a white card
 * that is 370 wide on a 402 phone and 600 wide centred in 1024. So the card is
 * simply `max-width: 600px; margin: auto` and needs no media query. The photo
 * keeps a 370/200 ratio, which is what BOTH frames use (600/324 is the same
 * ratio) - so it needs no media query either.
 */
const PAGE_CSS = `
/* ⚠️ THE DS SHIPS NO @font-face. It names the families and stops there, so
   loading the files is the consuming site's job. Dropping this block is
   invisible on a Mac with both fonts installed and wrong for every real
   visitor - which is exactly how it got dropped once already. The files are
   already hosted for prepeat.app; this reuses them rather than adding a
   second copy. */
@font-face{font-family:'Montserrat';src:url('https://prepeat.app/fonts/Montserrat_700Bold.ttf') format('truetype');font-weight:700;font-display:swap}
@font-face{font-family:'IBM Plex Sans';src:url('https://prepeat.app/fonts/IBMPlexSans_400Regular.ttf') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'IBM Plex Sans';src:url('https://prepeat.app/fonts/IBMPlexSans_700Bold.ttf') format('truetype');font-weight:700;font-display:swap}
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--color-surface-neutral-lightest);
  padding: var(--semantic-layout-large) var(--semantic-layout-small) 0;
  font-family: var(--typography-font-family-paragraph);
  -webkit-font-smoothing: antialiased;
}
.card {
  max-width: 600px;
  margin: 0 auto;
  background: var(--color-surface-neutral-white);
  border-radius: var(--radius-large);
  padding-bottom: var(--semantic-layout-medium);
  overflow: hidden;
}
.logo {
  display: flex;
  justify-content: center;
  padding: var(--semantic-layout-small);
  border-bottom: 1px solid var(--border-subtle);
  font-family: var(--typography-font-family-header);
  font-weight: var(--typography-font-weight-emphasized);
  font-size: var(--typography-font-size-display-5);
  line-height: var(--typography-line-height-small);
  color: var(--text-subtle);
}
.logo i { font-style: normal; color: var(--text-link); }
/* Full-bleed inside the card: the frames run the photo edge to edge while every
   other row is inset by 16. */
.hero { aspect-ratio: 370 / 200; width: 100%; display: block; object-fit: cover;
        background: var(--color-surface-neutral-lighter); }
/* The generated card for a recipe whose photo is not ours to publish. Mirrors
   Figma "The chat card": the wordmark on surface/secondary, nothing per-recipe. */
.gencard { aspect-ratio: 370 / 200; display: flex; align-items: center;
           justify-content: center; background: var(--color-surface-secondary-main); }
.gencard span {
  font-family: var(--typography-font-family-header);
  font-weight: var(--typography-font-weight-emphasized);
  font-size: var(--typography-font-size-display-2);
  color: var(--color-surface-neutral-white);
}
.gencard i { font-style: normal; color: var(--text-link); }
.inset { padding-inline: var(--semantic-layout-small); }
.wall { background: var(--color-surface-neutral-lightest);
        border-radius: var(--radius-large); padding: var(--semantic-layout-small); }
.center { display: flex; justify-content: center; }
`;

/** DS Stack, vertical, with the frames' 16px rhythm.
 *
 *  ⚠️ TAKES ONLY `props` – children ride inside it. A `(props, ...children)`
 *  signature looks natural and is wrong: React invokes a function component as
 *  `Component(props, legacyContext)`, so the rest parameter swallows that
 *  second argument and renders it, which fails with "Objects are not valid as a
 *  React child (found: object with keys {})". */
const Column = (props) => h(Stack, { direction: 'column', gap: 'small', ...props });

/**
 * The page shell. `robots` is deliberately absent - see below.
 *
 * ⚠️ NO `robots: noindex` HERE ANY MORE, and the reason is the whole feature.
 * It was set so share pages stayed out of search. But a link sent to iMessage
 * came back as "Tryk for at indlæse eksempel" - no card at all, on both sides -
 * and a robots directive is the likeliest reason a preview generator declines to
 * build one. A page nobody can preview defeats the point of a share link, and
 * the pages are behind unguessable 32-character tokens, so the indexing risk was
 * always small: a crawler can only reach one someone posted publicly.
 */
function layout({ title, ogTags, tree }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${ogTags}
<meta name="generator" content="${esc(DS_VERSIONS)}">
<style>${DS_CSS}${PAGE_CSS}</style>
</head>
<body>
${renderToStaticMarkup(tree)}
</body>
</html>`;
}

/** The wordmark, the one piece of brand the DS does not own. */
const Logo = () => h('div', { className: 'logo' }, 'prep', h('i', null, '+'), 'eat');

/**
 * "Pia shared a recipe with you", with the name emphasised.
 *
 * ⚠️ ONE Text, WITH A NESTED <strong> - not two Texts side by side. The DS binds
 * `.Text_text strong` to the emphasized weight token (0.2.0), so this is correct
 * HTML that carries the design. Two nodes in a row would wrap badly the moment a
 * name is long, which is what the app currently does and should be changed to
 * match this.
 */
const SharedBy = ({ name }) =>
  name
    ? h(
        'div',
        { className: 'inset' },
        h(Text, { variant: 'body', muted: true }, h('strong', null, name), ' shared a recipe with you')
      )
    : null;

const minutes = (n) => (typeof n === 'number' && n > 0 ? n : null);

/** Total / Prep / Cook. Total only earns its place when it is the SUM of two
 *  numbers - with just one set, "Total 30 min  Cook 30 min" says the same thing
 *  twice and reads like a bug. Caught on the live page. */
function Times({ prep, cook }) {
  const rows = [
    prep != null && cook != null ? ['Total', accessTime, prep + cook] : null,
    prep != null ? ['Prep', restaurantMenu, prep] : null,
    cook != null ? ['Cook', whatshot, cook] : null,
  ].filter(Boolean);
  if (rows.length === 0) return null;
  return h(
    Stack,
    { direction: 'row', gap: 'xsmall', wrap: true },
    ...rows.map(([label, Glyph, n]) =>
      h(
        Stack,
        { key: label, direction: 'row', gap: 'xxsmall', align: 'center' },
        // Decorative: the label beside it already says "Total" / "Prep" / "Cook",
        // so an accessible name here would just be read out twice.
        h(Glyph, { size: 'sm' }),
        h(Text, { variant: 'bodySmall' }, h('strong', null, label)),
        h(Text, { variant: 'bodySmall', muted: true }, `${n} min`)
      )
    )
  );
}

/**
 * The conversion block. Two DS Buttons: the solid call to action, and the text
 * variant underneath.
 *
 * ⚠️ THE SECOND BUTTON POINTED AT THE APP STORE, which is the opposite of what
 * it says. "Already have it? Open the recipe" now re-attempts the link itself:
 * on iOS a universal link that already failed to open the app will not retry
 * from a normal href, so it goes to the app's own scheme, which no browser can
 * mistake for a web page.
 */
function GetApp({ sharedBy, token }) {
  const who = sharedBy ? `${sharedBy}’s` : 'this';
  return h(
    Fragment,
    null,
    h(
      'div',
      { className: 'inset' },
      h(
        Column,
        { className: 'wall' },
        h(Text, { variant: 'display6', as: 'h2' }, 'The recipe is in the app'),
        h(
          Text,
          { variant: 'body', muted: true },
          `Get Prep+Eat and ${who} recipe is waiting for you – ingredients, method, the lot. Free.`
        ),
        h(Button, { as: 'a', variant: 'solid', fullWidth: true, href: APP_STORE_URL }, 'Get Prep+Eat')
      )
    ),
    h(
      'div',
      { className: 'inset center' },
      h(
        Button,
        { as: 'a', variant: 'text', href: `prepeat://r/${encodeURIComponent(token)}` },
        'Already have it? Open the recipe'
      )
    )
  );
}

/**
 * Open Graph tags. THESE ARE THE PRODUCT: almost nobody types this URL, they
 * meet it as a card in a chat, and unfurl bots do not run JavaScript - which is
 * the entire reason this page is server-rendered rather than a static file that
 * fetches its own data.
 *
 * og:description is OUR OWN sentence, never the recipe's. An imported recipe's
 * description belongs to the site it came from and is dropped in the database
 * before it ever reaches here, but the rule is restated in code because this is
 * the one place where text becomes public.
 */
function ogTags({ url, title, sharedBy, totalMinutes, imageUrl, token }) {
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
  // ⚠️ THERE IS ALWAYS AN og:image NOW, and that is the whole point. Without
  // one, iMessage builds NO CARD AT ALL - just a grey bubble with the domain.
  // Proved on a device 2026-08-18 by sending two links from this same server,
  // identical but for the image.
  const image = imageUrl ?? (token ? new URL(`/og/${token}.png`, url).toString() : null);
  if (image) {
    tags.push(`<meta property="og:image" content="${esc(image)}">`);
    tags.push(`<meta property="og:image:width" content="1200">`);
    tags.push(`<meta property="og:image:height" content="630">`);
    tags.push(`<meta name="twitter:card" content="summary_large_image">`);
  }
  return tags.join('\n');
}

/** The live page. `share` is a row from Supabase's share_by_token(). */
export function renderShare({ share, url, token }) {
  const prep = minutes(share.prep_minutes);
  const cook = minutes(share.cook_minutes);
  const total = prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null;

  // Own photo → show it. No photo (imported, or never had one) → the generated
  // card. Unlike the old page, the card carries NOTHING per-recipe, so the title
  // is always rendered below it and every variant has exactly one h1.
  const hero = share.image_url
    ? h('img', { className: 'hero', src: share.image_url, alt: share.title })
    : h('div', { className: 'gencard' }, h('span', null, 'prep', h('i', null, '+'), 'eat'));

  const tree = h(
    Column,
    { className: 'card' },
    h(Logo),
    h(SharedBy, { name: share.shared_by }),
    hero,
    h(
      'div',
      { className: 'inset' },
      h(
        Column,
        null,
        h(Text, { variant: 'display5', as: 'h1' }, share.title),
        share.description ? h(Text, { variant: 'body', muted: true }, share.description) : null,
        h(Times, { prep, cook })
      )
    ),
    h(GetApp, { sharedBy: share.shared_by, token })
  );

  return layout({
    title: `${share.title} – Prep+Eat`,
    ogTags: ogTags({
      url,
      title: share.title,
      sharedBy: share.shared_by,
      totalMinutes: total,
      imageUrl: share.image_url,
      token,
    }),
    tree,
  });
}

/** The four dead ends share a shape: heading, explanation, and a way in. */
function deadEnd({ title, body, blurb }) {
  return h(
    Column,
    { className: 'card' },
    h(Logo),
    h(
      'div',
      { className: 'inset' },
      h(
        Column,
        null,
        // Decorative: the heading immediately below says the same thing in words.
        // The glyph is icon/brand in the frames, not the inherited text colour -
        // Icon paints with currentColor, so the token is set on the element.
        h(heartBroken, { size: 'lg', style: { color: 'var(--icon-brand)' } }),
        h(Text, { variant: 'display5', as: 'h1' }, title),
        h(Text, { variant: 'body', muted: true }, body)
      )
    ),
    h(
      'div',
      { className: 'inset' },
      h(
        Column,
        { className: 'wall' },
        h(Text, { variant: 'display6', as: 'h2' }, 'See what Prep+Eat is'),
        h(Text, { variant: 'body', muted: true }, blurb),
        h(Button, { as: 'a', variant: 'solid', fullWidth: true, href: APP_STORE_URL }, 'Get Prep+Eat')
      )
    )
  );
}

/**
 * Revoked, or the recipe was deleted. We still have the row, so we still know
 * who shared it – which is why this can name them and stay warm instead of
 * reading as an error. Deliberately different from notFound() below.
 */
export function renderRevoked({ share, url }) {
  const who = share.shared_by ?? 'Whoever sent this';
  return layout({
    title: 'Not shared any more – Prep+Eat',
    ogTags: ogTags({ url, title: 'Prep+Eat', sharedBy: null, totalMinutes: null }),
    tree: deadEnd({
      title: `${who} isn’t sharing this one any more`,
      body: 'The link has been turned off. Ask for a new one – it only takes a second.',
      blurb: 'Download Prep+Eat free from the App Store.',
    }),
  });
}

/**
 * The link simply ran out - 30 days from the day it was created (migration
 * 0038).
 *
 * ⚠️ IT DOES NOT NAME THE SENDER, AND THAT IS DELIBERATE. Revoked says "Pia
 * isn't sharing this one any more" because that was Pia's decision. Expiry is
 * not anyone's decision, so naming her would imply she did something. Nobody is
 * at fault here, so the sentence has no subject - and `share_by_token` withholds
 * `shared_by` for this status, so there is nothing to accidentally interpolate.
 *
 * It is also the only dead end that says WHY, because "expired" invites the
 * question and a reader who does not get an answer assumes something is broken.
 * It closes on the same "ask for a new one" as revoked, because the way out is
 * identical.
 */
export function renderExpired({ url }) {
  return layout({
    title: 'Link expired – Prep+Eat',
    ogTags: ogTags({ url, title: 'Prep+Eat', sharedBy: null, totalMinutes: null }),
    tree: deadEnd({
      title: 'This link has expired',
      body: 'Links stop working after 30 days. Ask for a new one – it only takes a second.',
      blurb: 'Download Prep+Eat free from the App Store.',
    }),
  });
}

/**
 * No row at all: a mistyped or truncated token. We know NOTHING – not even who
 * sent it – so this must stay generic. That is a real difference from revoked,
 * not a shortcut.
 */
export function renderNotFound({ url }) {
  return layout({
    title: 'Link not found – Prep+Eat',
    ogTags: ogTags({ url, title: 'Prep+Eat', sharedBy: null, totalMinutes: null }),
    tree: deadEnd({
      title: 'This link doesn’t lead anywhere',
      body: 'It may have been mistyped or cut short. Ask whoever sent it to share it again.',
      blurb: 'Download Prep+Eat free from the App Store.',
    }),
  });
}

/** Something broke on our side. Never blames the reader. */
export function renderError({ url }) {
  return layout({
    title: 'Prep+Eat',
    ogTags: ogTags({ url, title: 'Prep+Eat', sharedBy: null, totalMinutes: null }),
    tree: deadEnd({
      title: 'We can’t load this right now',
      body: 'Something went wrong at our end. Try again in a moment.',
      blurb: 'Download Prep+Eat free from the App Store.',
    }),
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
  //
  // ⚠️ THE APP MUST NOT COPY THIS GUARD. `+native-intent` had the same test and
  // it made the "link doesn't lead anywhere" screen unreachable, because a
  // cut-short token is by definition not 32 hex characters. Here the guard is
  // safe precisely because failing it still renders that page - it only skips
  // the database round trip.
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
  // 410 Gone either way - the resource existed and is deliberately no longer
  // here - but the two say different things to the reader, which is the whole
  // reason `expired` is a separate status rather than a relabelled `revoked`.
  //
  // ⚠️ ANY OTHER NON-LIVE STATUS STILL FALLS THROUGH TO REVOKED. That fallback
  // is what let migration 0038 go live before this deploy did, and it must keep
  // pointing that way: an unrecognised status has to read as gone, never as
  // live.
  if (share.status === 'expired') {
    return { status: 410, html: renderExpired({ url }), cacheControl: 'no-store' };
  }
  if (share.status !== 'live') {
    // Not cached: a revoked link must stop working promptly, and revocation is
    // the only safety valve a sharer has.
    return { status: 410, html: renderRevoked({ share, url }), cacheControl: 'no-store' };
  }
  // Short cache: the snapshot never changes, but revocation must take effect
  // quickly, and an unfurl bot plus the reader are usually two hits seconds
  // apart.
  return {
    status: 200,
    html: renderShare({ share, url, token }),
    cacheControl: 'public, max-age=60',
  };
}
