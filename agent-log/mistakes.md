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
