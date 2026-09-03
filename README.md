# Three months, timestamped

A private, password-gated Discord Wrapped: thirteen full-bleed cards, one real
statistic each, advanced by tap, swipe or arrow key. Every card is its own
colour world with its own shape composition and its own way of arriving. Built
for one person, on a phone, once.

Static site. No API, no database, no analytics, no third-party requests — the
fonts are self-hosted and the data is one local JSON file.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

`npm run build` type-checks, syncs the fonts and the data file into `public/`,
and emits `dist/`.

## The data

Everything the site renders comes from `data/wrapped.json`. That file is
generated, never hand-edited.

1. Export the conversation with
   [DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter) in
   **JSON** format and drop the file (or files) in `data/export/`. That
   directory is git-ignored — the conversation never gets committed.
2. Fill in `data/config.json`: the timezone every hour-of-day figure is
   computed in, both people's names and Discord author ids, and the message ids
   for the two quote cards. The generator tells you the author ids it found if
   you get one wrong.
3. Run it:

   ```bash
   npm run data
   ```

   It prints every figure it computed. Read that list before shipping — the
   whole point of the piece is that the numbers are true.

Until then `data/wrapped.json` holds clearly-marked placeholder figures so the
sequence can be designed and reviewed. **`npm run build` refuses to build while
those placeholders are in place** (set `ALLOW_PLACEHOLDER=1` to override for
design work).

Discord's own personal data package won't work: it records only your own
messages, with no author on each one, so it can't produce the who-said-more
card. The generator detects it and says so.

## The score

Drop an audio file at `public/score.mp3`. Nothing else is needed — it is loaded
in the background, never gates the first card, fades up over 1.8s on the first
tap (browsers will not start audio without a gesture), loops, and dips briefly
on each card change. A sound toggle appears in the corner and the choice is
remembered per browser.

Leave the file out and `loadScore()` resolves to null, the control never
appears, and the sequence behaves exactly as it does now. The file is
git-ignored: supply it at deploy time rather than committing music into the
repo.

## The password gate

`middleware.ts` is Vercel Edge Middleware. Nothing behind it — not the cards,
not `wrapped.json` — is served without the password; only `/fonts/*` and the
icon are public, so the gate itself can be typeset.

Set two environment variables on the Vercel project:

| Variable | Required | What it does |
| --- | --- | --- |
| `WRAPPED_PASSWORD` | yes | The password. |
| `WRAPPED_SECRET` | no | HMAC key for the session cookie. If unset, the password is used, so changing the password also ends every open session. |

A correct password sets an HttpOnly, Secure, SameSite=Lax cookie signed with
HMAC-SHA-256 and good for thirty days. Comparisons are constant-time and wrong
answers are slowed down; there is no shared store at the edge to do real rate
limiting, so pick a password worth having.

## Deploying

Vercel, framework preset "Other". `vercel.json` sets the build command, the
output directory, and the security headers (CSP, `noindex`, no referrer,
`no-store` on the data file).

## Printing

The card set doubles as artwork for the printed companion piece. Print from the
browser: A5 portrait, one card per page, backgrounds on, counting figures at
their final value.

## Layout of the repo

```
data/config.json      what the generator needs to know
data/wrapped.json     the single file the site reads
data/export/          the raw Discord export (git-ignored)
scripts/build-data.mjs  export -> wrapped.json
scripts/prepare.mjs   fonts + data into public/, and the placeholder guard
src/cards/            the card types and their renderers
src/palette.ts        the thirteen-card colour arc
src/shapes.ts         one shape composition per card
src/audio.ts          the score, if there is one
src/deck.ts           the sequence, and tap/swipe/keyboard
src/fit.ts            measures each figure so it fits the measure
src/countup.ts        the count-up, on the same curve as the landing
src/styles/           tokens, base, cards, print
middleware.ts         the password gate
DESIGN.md             the design system, and why each decision is that way
```
