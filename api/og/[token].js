import { ImageResponse } from '@vercel/og';

import { credentialsFor } from '../../lib/render.mjs';

export const config = { runtime: 'edge' };

/**
 * The chat preview image, generated per recipe.
 *
 * ⚠️ THIS IS NOT DECORATION. Proved on a device 2026-08-18: a share page WITHOUT
 * `og:image` gets no card at all in iMessage - just a grey bubble reading
 * "share.prepeat.app". A page with one previews properly. iMessage's rich link
 * is image-led, so a title and a description do not earn a card on their own.
 * 93 of 97 recipes have no publishable photo, so without this endpoint 93 of 97
 * shares arrive as a bare grey link.
 *
 * Design: the mocha card from docs/sketches/share-flow-review.html, chosen by
 * Thomas 2026-08-18 as an interim "till my design lands". Mocha rather than
 * lime because at the size a card is actually seen - about 236px wide - lime
 * reads as a bright green rectangle before it reads as anything, and a chat is
 * already full of colour.
 *
 * ⚠️ REPLACE THE LAYOUT BELOW WHEN THOMAS'S FRAME ARRIVES, not the plumbing.
 */

const MOCHA = '#4F4230';
const MOCHA_DEEP = '#3A3123';
const LIME_LIGHT = '#83E651';

// Fetched once per edge instance. prepeat.app serves these with CORS, and it is
// the same file the app and the page use, so the card cannot drift in type.
let montserratPromise;
function montserrat() {
  montserratPromise ??= fetch('https://prepeat.app/fonts/Montserrat_700Bold.ttf').then((r) => {
    if (!r.ok) throw new Error(`font ${r.status}`);
    return r.arrayBuffer();
  });
  return montserratPromise;
}

/**
 * Type size by title length. Titles run 6 to 72 characters (median 19), so one
 * fixed size cannot work: "Pad Krapow" looks lost at the small size and the
 * 72-character banana bread runs off the card at the large one.
 */
function titleSize(title) {
  const n = title.length;
  if (n <= 16) return 108;
  if (n <= 28) return 88;
  if (n <= 44) return 68;
  return 52;
}

export default async function handler(req) {
  const url = new URL(req.url);
  // The route captures the whole segment, so `abc.png` arrives with the
  // extension attached - fetchers like an image-looking URL.
  const token = (url.pathname.split('/').pop() ?? '').replace(/\.png$/, '');
  // Same host-decides-the-database rule as the page, or a dev share's card
  // would be generated from production and come back generic.
  const { supabaseUrl, anonKey } = credentialsFor(
    req.headers.get('x-forwarded-host') ?? url.host,
  );

  let title = 'A shared recipe';
  if (/^[0-9a-f]{32}$/.test(token)) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/share_by_token`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_token: token }),
      });
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      // A revoked share still returns a row, with a null title, so the generic
      // wording means a stale card never shows a recipe no longer shared.
      if (row?.title) title = row.title;
    } catch {
      // Fall through to the generic card: a preview must never 500, or the
      // message loses its card over a database blip.
    }
  }

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          // 72px all round: some apps crop the card to a square, taking ~285px
          // off each side, so nothing may sit near an edge.
          padding: '72px',
          backgroundImage: `linear-gradient(150deg, ${MOCHA} 0%, ${MOCHA_DEEP} 100%)`,
          fontFamily: 'Montserrat',
        },
        children: [
          {
            type: 'div',
            props: { style: { fontSize: 34, color: LIME_LIGHT }, children: 'prep+eat' },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: titleSize(title),
                color: '#FFFFFF',
                lineHeight: 1.08,
                // satori needs an explicit width to wrap: 1200 less the padding.
                maxWidth: 1056,
              },
              children: title,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Montserrat', data: await montserrat(), weight: 700, style: 'normal' }],
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    },
  );
}
