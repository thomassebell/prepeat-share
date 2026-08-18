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

⚠️ **MEASURED 2026-08-18, AND IT IS WORSE THAN "WEAKER": THERE IS NO CARD AT
ALL.** Two share links, same server, same tags, one with `og:image` and one
without. The one with an image previewed with the photo on both sides. The one
without showed "Tap to Load Preview" and, when tapped, collapsed to a grey bubble
reading `share.prepeat.app` with a Safari icon. **iMessage's rich link is
image-led** – a title and a description alone do not earn a card.

So `og:image` is not an enhancement here, it is the precondition for a preview
existing. Generating the title card as a PNG (`satori` + `resvg`, or
`@vercel/og`) is the fix, and it is the last thing between sharing and working.

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

**LIVE at https://share.prepeat.app since 2026-08-17.** DNS is a CNAME on
`share` at Porkbun pointing to a project-specific Vercel host; the certificate
issued about a minute after the record propagated.

To ship a change:

```sh
npx vercel deploy --prod --yes     # from this folder, which is linked
```

The folder is linked to project `prj_sauXQqDDRcS5BSPS6vrre9v9RdUX` in
`sebellds-projects`. `vercel link` wrote `.env.local`, which holds an OIDC token
and is gitignored – do not commit it.

⚠️ **There is no Git integration yet**, so a deploy only happens when someone
runs that command. Connecting a GitHub repo would make pushes deploy themselves
and is worth doing before anyone else touches this.

⚠️ **DNS warning for anyone editing Porkbun:** `prepeat.app` itself and `www`
point at GitHub Pages and serve the privacy and support pages App Store Connect
requires for the LIVE listing. Only ever ADD records for `share`.

## Revocation is not instant

Live pages are cached for 60 seconds at the edge, so a revoked link keeps
working for up to a minute (measured: 36s). That is the deliberate trade – the
alternative is `no-store`, which sends every unfurl bot and every reader
straight through to Supabase. Worth revisiting if revocation ever needs to be
immediate.
