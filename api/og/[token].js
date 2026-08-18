import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

/**
 * The chat preview image – Thomas's design, Figma "The chat card" on the
 * Recipes page (1200×630).
 *
 * ⚠️ THIS IS NOT DECORATION. Proved on a device 2026-08-18: a share page WITHOUT
 * `og:image` gets no card at all in iMessage - just a grey bubble reading
 * "share.prepeat.app". A page with one previews properly. iMessage's rich link
 * is image-led, so a title and a description do not earn a card on their own.
 * 93 of 97 recipes have no publishable photo, so without this endpoint 93 of 97
 * shares arrive as a bare grey link.
 *
 * ⚠️ THE CARD CARRIES NOTHING PER-RECIPE, AND THAT IS THE DESIGN. It is the
 * wordmark on surface/secondary and nothing else. Two consequences, both
 * deliberate:
 *
 *   1. **No title on the card.** The interim card (mine, replaced 2026-08-18)
 *      burnt the recipe title into the image, so a chat bubble showed the title
 *      TWICE - once inside the picture and once as the link title underneath.
 *      Thomas saw that on a real TestFlight share and it is what this replaces.
 *   2. **No token lookup.** Every card is byte-identical, so this no longer
 *      reads the token, calls the database or sizes type to the title length.
 *      The route still takes a token because links already sent point at
 *      `/og/<token>.png` and must keep resolving - the token is simply ignored.
 *
 * Values are Thomas's, read from the frame's bound variables rather than its
 * CSS fallbacks (which are stale): background `color/surface/secondary/main`
 * #6F5D44, the "+" in `text/link` #56C91D, the rest white.
 */

const SURFACE_SECONDARY = '#6F5D44';
const LINK_GREEN = '#56C91D';

// Fetched once per edge instance. prepeat.app serves this with CORS, and it is
// the same file the app and the page use, so the card cannot drift in type.
let montserratPromise;
function montserrat() {
  montserratPromise ??= fetch('https://prepeat.app/fonts/Montserrat_700Bold.ttf').then((r) => {
    if (!r.ok) throw new Error(`font ${r.status}`);
    return r.arrayBuffer();
  });
  return montserratPromise;
}

const line = (children) => ({
  type: 'div',
  props: { style: { display: 'flex', fontSize: 200, lineHeight: 1.12 }, children },
});

export default async function handler() {
  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingLeft: 168,
          paddingRight: 168,
          backgroundColor: SURFACE_SECONDARY,
          fontFamily: 'Montserrat',
          color: '#FFFFFF',
        },
        children: [
          line('prep'),
          line([
            { type: 'span', props: { style: { color: LINK_GREEN }, children: '+' } },
            { type: 'span', props: { children: 'eat' } },
          ]),
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Montserrat', data: await montserrat(), weight: 700, style: 'normal' }],
      headers: {
        // Identical for every share now, so it can be cached hard.
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    },
  );
}
