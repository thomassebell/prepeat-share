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

## Fonts come from prepeat.app

`https://prepeat.app/fonts/*.ttf`, which GitHub Pages serves with
`access-control-allow-origin: *` (checked 2026-08-17). Deliberate: it keeps this
project text-only so it can be deployed from a file tree, and the fonts are
first-party, so the "no third-party tracking" reason for self-hosting still
holds. The cost is a soft dependency – if those files move, the type silently
falls back. Self-host them here if this project ever gets a git-based deploy.

## Supabase details are in the code, on purpose

`DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_ANON_KEY` in `lib/render.mjs` point
at **production**. Neither is a secret: both ship inside every copy of the app,
and migration 0034 leaves the anon role able to do exactly one thing – call
`share_by_token()`, which needs a token it cannot guess. Having them in the code
means the deploy is self-contained. The env vars still win, which is how
`dev-server.mjs` points at the dev project.

## Deploying

**Verified working against production on 2026-08-17** via an anonymous
`vercel deploy --temporary`: a real share of a real recipe rendered correctly,
and revoking it took the page down 36 seconds later (inside the 60s cache).

**Not yet permanently deployed.** The Vercel token available here can read the
team but not create a project – `403 forbidden: You don't have permission to
create a project`. Needs Thomas:

1. Create the `prepeat-share` project (or grant project-creation rights).
2. Point `share.prepeat.app` at it.
3. Then ungate the app's Share action, which is deliberately dev-app-only until
   a link resolves.

## Revocation is not instant

Live pages are cached for 60 seconds at the edge, so a revoked link keeps
working for up to a minute (measured: 36s). That is the deliberate trade – the
alternative is `no-store`, which sends every unfurl bot and every reader
straight through to Supabase. Worth revisiting if revocation ever needs to be
immediate.
