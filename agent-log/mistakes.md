# What the agent got wrong

Kept as I went. Each entry: what it claimed or wrote, how I caught it, what the
truth was, and where the fix landed.

---

## 1. Claimed the Function would silently store an empty string

**What it said.** While planning the profile form, the agent predicted that
sending `bio: ""` would be written to the table as an empty string, silently
breaking the "clearing one has to actually remove it" requirement.

**How I caught it.** I read `functions/personal-account/src/validation.js`
before trusting the prediction. `bio` is
`z.string().trim().min(1, ...).max(2000).nullable().optional()`, so `""` fails
`min(1)` and the route answers `400 invalid_request` with
`issues: [{ field: 'bio', ... }]`. Nothing is stored.

**Why it matters.** The real failure mode is the opposite one: dropping an empty
field from the payload returns `200` and silently keeps the old value. That is
the case the form has to handle, and it is the one that looks fine until you
hard refresh.

**Fix.** Planning correction, no code yet. The payload builder and its test are
tracked for the profile commit.

---

## 2. Asserted an API key scope was unnecessary without testing it

**What it said.** The agent stated flatly that `users.write` is not needed for
the API key and should be dropped, on least-privilege grounds.

**How I caught it.** `account.createEmailToken` creates the Appwrite user when
the email has never been seen, which is exactly the new-visitor path this task
depends on. That write plausibly needs `users.write`, and the agent had not
checked.

**Why it matters.** Dropping it on reasoning alone would have broken sign-up for
every new email while leaving sign-in working for me, since my own account
already exists. A bug that only reproduces for people who are not me.

**Fix.** Kept the scope until measured. Removing scopes one at a time and
retrying with a fresh email is tracked; the result goes in NOTES.md.

---

## 3. Pulled the server SDK into the browser bundle

**What it wrote.** The onboarding route imported `PERSONAL_ROLES`, an ordinary
constant, from `#/server/personal-account`. That module imports `node-appwrite`.

**How I caught it.** The page threw `Cannot read properties of undefined
(reading 'node')` on navigation. The dev server log showed why: `node-appwrite`
was being evaluated in the browser, alongside warnings that `node:http` and
`node:buffer` had been externalized for browser compatibility.

**Why it matters.** This breaks the first rule of the task. TanStack Start
replaces a `createServerFn` export with an RPC stub, so importing one is safe,
but importing *any* ordinary value from the same module drags the whole module
in. The two look identical at the import site. No key was actually inlined, but
the boundary the rule depends on was gone, and only a runtime crash revealed it.

Worth noting: `npm run build` fails outright on this, so it could only ship
broken, never silently. It appeared in dev alone.

**Fix.** Everything a component needs moved to `src/shared/personal-account.ts`,
which imports nothing from the server. Commit `e6e8c08`.

---

## 4. Wrote a check that passed on nothing

**What it wrote.** A script to fail the build if server-only code reached the
client bundle, added right after mistake 3.

**How I caught it.** I put the bug back to see the check fail. It printed
`0 client files carry nothing server-only` and exited 0. The build had failed,
so `dist/client` was empty, and the check read an empty directory as a pass.

**Why it matters.** A green check that cannot go red is worse than no check: it
gets trusted. The failure mode is exactly when something is wrong, since that is
when the build is most likely to have produced nothing.

**Fix.** The check now fails when it finds nothing to scan. Both paths tested:
empty directory exits 1, real bundle exits 0. Commit `5ac55eb`.

---

## 5. Trusted the router's own search validator to sanitise

**What it wrote.** `validateSearch` on the sign-in and onboarding routes, running
the `redirect` parameter through `safeRedirect` there, on the assumption that
everything downstream would then be reading a cleaned value.

**How I caught it.** I tried the attack against the running app rather than
reading the code. `/onboarding?redirect=https://evil.com` forwarded the hostile
value straight into the `/signin` URL. Logging both ends showed why:

    [validateSearch] in  = {"redirect":"https://evil.com"}
    [validateSearch] out = /
    [useSearch]      redirect = "https://evil.com"

The validator ran, returned the safe value, and the component was handed the
raw one anyway.

**Why it matters.** This is the open redirect the brief invites, and it would
have shipped looking defended. The guard was present, readable, and in the
wrong place, which is worse than no guard at all: a reviewer skimming the route
would have seen `safeRedirect` and moved on.

**Fix.** `validateSearch` now only declares the shape. Every read goes through
`safeRedirect` at the point of use, in both `beforeLoad` and the component,
because cleaning it in one does not clean it in the other. Retested against the
running app: hostile values land on the home page, `/profile` still comes back.
Commit `e821737`.

---

## 6. Handed the router a string and called it a destination

**What it wrote.** The onboarding guard forwarded people with
`redirect({ href: next })`, where `next` was a path that had been through
`safeRedirect`. It typechecked, and a signed-out request to `/profile` answered
`307 /signin?redirect=%2Fprofile` when tested with curl, so it looked done.

**How I caught it.** By signing in. The code was accepted, nothing moved, and a
second click said the code had expired. The server log had the reason:

    A notFoundError was encountered on the route with ID "__root__"

The session had been created and the one-time code consumed on the first click;
the navigation after it never happened. The second click then found no pending
sign-in cookie, which is exactly what an expired code looks like.

**Why it matters.** Two lessons, and the second is the bigger one. `href` takes
a string the router has to resolve at runtime, and it resolved to nothing;
`to` takes a route it knows at build time. And the test I had run only covered
the server-rendered redirect, which took a different path through the router
than a client-side navigation did. Green tests, broken flow.

**Fix.** `safeRedirect` no longer returns "a string that looks safe". It ends in
a list of the routes worth returning to and its type is the union of those two
literals, so the router gets `to` and TypeScript checks the destination exists.
`/signin` and `/onboarding` are not in the list, because returning someone to
where they just came from is a loop. Fifteen cases checked, including the two
newly excluded routes. Commit `<allowlist>`.

---

<!--
Still to record as they happen. Likely candidates, based on where this stack is
easy to get wrong:
  - reading createExecution's result without checking responseStatusCode, so a
    404 (which means "not onboarded") is treated as a failure
  - loading the current user in an effect, which flashes "Sign in" on first paint
  - writing the older databases.createDocument API instead of TablesDB
  - following the brief's redirect / userId / logout notes literally
Do not pad this list. Three real ones beat six invented ones.
-->
