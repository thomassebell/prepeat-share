# prepeat-share

Server-rendered share pages for Prep+Eat recipes. One route: `/r/<token>`.

Spec and product decisions: `docs/share-recipe.md` in the **prepeat** repo.
Design: `docs/sketches/share-page-design.html` there too.

## Why this exists as its own thing

Two reasons, and neither is "we felt like a new repo".

**It has to render on the server.** Nearly everyone meets a shared recipe as a
card in a chat, and unfurl bots do not run JavaScript – they read Open Graph
tags out of the HTML. A static page that fetched its own data would unfurl as a
generic "Prep+Eat" card with no recipe on it. For a feature whose whole purpose
is mouth-to-mouth sharing, that card *is* the product.

**It must not share a deploy with prepeat.app.** That domain is served by
`prepeat-web` on GitHub Pages and carries `privacy.html` and `support.html`,
which are the URLs App Store Connect requires for the **live** listing. Putting a
new, changing service on the same host would put two URLs Apple mandates inside
every deploy's blast radius. Hence a subdomain: `share.prepeat.app`.

## Shape

```
api/r/[token].js   Vercel Node function. Thin – headers and env, nothing else.
lib/render.mjs     All the logic and markup. No framework, no npm dependencies.
dev-server.mjs     Plain-node server that runs the SAME lib/, for local review.
public/fonts/      The two DS faces, self-hosted (see prepeat-web on why).
vercel.json        /r/:token → the function; / → prepeat.app
```

No dependencies at all: `fetch` is built into Node 20. That keeps deploys
instant and means there is nothing to audit or update.

## It holds no secrets

The page calls Supabase's `share_by_token()` with the **anon** key. That function
is the only thing anon may do: it takes the token as an argument, so there is
nothing to enumerate, and `recipe_shares` itself is unreadable to anon
(migration 0034). So this host needs no service-role key and there is nothing
here worth stealing.

## Local review

```sh
SUPABASE_URL=<dev url> SUPABASE_ANON_KEY=<dev anon key> npm run dev
# then http://localhost:8790/r/<token>
```

Tokens created by the **dev** app resolve against the dev database. Create one
by sharing a recipe from Prep+Eat Dev on the phone, or from SQL with
`select public.create_recipe_share('<recipe id>')`.

## States

| | HTTP | what the reader sees |
|---|---|---|
| live, own recipe | 200 | photo, title, description, times, the ask |
| live, imported | 200 | generated title card, times, the ask – no photo, no text |
| revoked or recipe deleted | 410 | named: "Pia isn't sharing this one any more" |
| unknown or malformed token | 404 | generic – we know nothing, not even who sent it |
| Supabase unreachable | 503 | "we can't load this right now", never blames the reader |

A malformed token is rejected on shape (32 hex chars) before it costs a database
round trip.

## ⚠️ THE KNOWN GAP: no preview image for imported recipes

An imported recipe's photo is not ours to republish, so the page draws a
generated title card instead – which is trivial in CSS. **The chat preview is a
different problem**: an unfurl bot needs a real raster image and never renders
CSS, so those shares currently unfurl as a compact text card (title, "Pia shared
a recipe · 30 min", the domain). Functional, and weaker than it should be.

**This matters more than it sounds.** On production, 91 of 97 live recipes are
imported and only 4 are hand-written *with* a photo. So the rich card is the rare
case and the text card is the norm – for a growth feature, in the exact place the
growth happens.

The fix is to generate the title card as a PNG (`satori` + `resvg`, or
`@vercel/og`) and point `og:image` at it. Deliberately not done in the first
version: it is the only thing here that needs a dependency and a build step, and
it should be measured rather than assumed. Nothing else blocks on it.

## Deploying (not done yet)

Needs Thomas: a Vercel project, `share.prepeat.app` pointed at it, and the two
env vars set to **production** Supabase. `SUPABASE_ANON_KEY` is the publishable
key that already ships inside the app, so it is not a secret – but it must be the
production one, or shares made by real users will not resolve.
