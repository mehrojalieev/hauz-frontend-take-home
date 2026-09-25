# HAUZ frontend take-home

Sign-in, onboarding and profile for a property marketplace, built on the
starter in `TASK.md`. This file is about getting it running. The decisions, and
the places I did not follow the brief, are in `NOTES.md`.

## What you need

- Node 22 or newer
- A free Appwrite Cloud account at https://cloud.appwrite.io

## Setup

Roughly 15 minutes, most of it waiting for the Function to build.

### 1. Install dependencies

```bash
npm install
```

### 2. Create an Appwrite project

In the Appwrite Console, create a new project. From **Overview**, copy the
**Project ID** and the **API Endpoint**. The endpoint is region specific, for
example `https://fra.cloud.appwrite.io/v1`.

Put both into `appwrite.config.json`, replacing the `projectId` and the
`endpoint` if your region differs.

### 3. Push the database, table and Function

```bash
npx appwrite login
npm run appwrite:push
```

That creates the `main` database, the `personal_accounts` table with its unique
index, and deploys the `personal-account` Function. The first deployment takes a
minute or two.

Confirm it worked: the Function should appear under **Functions** with a ready
deployment, and its **Execute access** should be `users`.

> `appwrite push table` treats `appwrite.config.json` as the whole schema and
> deletes tables that are not in it. Safe on the fresh project you just made.
> Never run it against a project that has anything else in it. To redeploy only
> the Function later, use `npx appwrite push function --all --force`.

### 4. Create an API key

Console, **Overview**, **Integrations**, **API keys**, **Create API key**.

One scope: **`sessions.write`**.

The starter asked for four. Measured against this project the other three are
never reached, and the reasoning is written out in `.env.example`. The key is
used in exactly one call, `account.createSession`.

Copy the secret once. You cannot read it again.

### 5. Fill in your environment

```bash
cp .env.example .env
```

Fill in `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`.
`.env` is git-ignored. Do not commit it.

### 6. Run it

```bash
npm run dev
```

http://localhost:3000

## Trying it out

Sign in with any email you can read. Appwrite Cloud sends the code from its own
mail server on the free plan, so check your spam folder; if nothing arrives
after a few minutes it may be rate limiting you, so wait rather than clicking
send repeatedly.

Worth a look while you are in there:

- Hard refresh while signed in. The header is right in the first paint, not
  corrected afterwards.
- Open `/profile` signed out. It signs you in and comes back to `/profile`.
- Try `/signin?redirect=https://example.com`. It goes to the home page.
- Put something in the bio, save, clear it, save, then reload. It stays gone.
- Appearance and language are in the header. Both are resolved on the server,
  so a hard refresh does not flash the previous one.
- Narrow the window to a phone. The header keeps the brand, both settings and
  the way out; the labels give way to the icon and a language code.

## If something does not work

**Sign-in says it is unavailable, and nothing arrives.** Almost always a missing
or half-filled `.env`. The signed-out pages render without it — the app does not
call Appwrite until there is a session to resolve — so the first sign it is
wrong is the first call that needs it. The terminal running `npm run dev` says
which variable is missing.

**The first action after a while takes ten seconds or more.** Appwrite Cloud
lets a Function go cold on the free plan; a cold start measured twelve seconds
against three hundred milliseconds warm. Calls have a thirty second deadline,
which is where Appwrite itself gives up, so it degrades rather than hangs.

**Every Function call returns 408.** The container has wedged, which happened
once here. `npx appwrite push function --all --force` gives it a fresh one.

**A page left open for a long time stops responding.** In development the
server function ids change as files are edited, so a page from an older build
calls ids the server no longer knows. Reload it.

## Scripts

```bash
npm run dev            development server on :3000
npm run build          production build
npm run typecheck      tsc --noEmit
npm run verify         typecheck, build, then check the client bundle
npm run check:client   fail if anything server-only reached the browser
npm run generate-routes
npm run appwrite       the Appwrite CLI, scoped to this project's config
```

`check:client` is the first rule of the task turned into a check rather than a
habit: it scans the built client output for the server SDK, for Appwrite
credential headers, and for the literal value of `APPWRITE_API_KEY`. It is worth
running before pushing, because the safe import and the unsafe one look
identical at the import site.

## What is in here

```
src/
  routes/                 the four screens, plus the root shell
  components/             header, menu, icons, preferences
  server/                 everything that talks to Appwrite; never imported by a component
  shared/                 types, translations, and pure helpers both sides use
  lib/shell.ts            the cached per-request shell
scripts/                  the client bundle check
functions/personal-account/   the Function, one message changed, see NOTES.md
agent-log/                agent sessions and the mistakes I caught
```

Nothing under `src/server` may be imported from a component. TanStack Start
replaces a `createServerFn` export with an RPC stub, so importing one is safe,
but importing any ordinary value from the same module pulls the whole module,
`node-appwrite` and all. That is what `src/shared` is for.

## The Function

One Appwrite Function with three routes, deployed with **Execute access:
users**, so a signed-in Appwrite user can execute it and a guest cannot.

| Route | Body | Result |
|---|---|---|
| `GET /personal-account` | | `200` with the account, `404` if the caller has none |
| `POST /personal-account` | `firstName`, `lastName`, `role` | `201` created, `200` if it already exists, `409` if it exists with a different role |
| `PATCH /personal-account` | any of `firstName`, `lastName`, `contactEmail`, `bio` | `200` with the updated account |

`role` is either `property_owner` or `realtor`.

On `PATCH`, a field you leave out keeps its stored value and `null` clears it.
Every route answers `401` when the execution has no signed-in Appwrite user.

Errors come back as `{ "error": "<code>", "message": "...", "issues": [...] }`.
Codes: `unauthorized`, `not_found`, `invalid_request`,
`personal_account_inconsistent`, `internal_error`.
