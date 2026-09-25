# Agent session

The whole conversation this take-home was built in, exported from Claude Code:
51 prompts, 305 replies, 499 tool calls, and the commands, their output and the
files that changed along the way.

It is one session. It is split into `session-01.md` and `session-02.md` only
because GitHub will not render a single Markdown file of this size.

## A note on language

**The conversation is in Uzbek.** That is the language I work in, and I have not
rewritten it: a prompt tidied into better English afterwards is no longer a
record of what was actually asked, and several of mine were me asking for the
wrong thing and changing direction a few turns later.

Where the reasoning matters it is written in English elsewhere in this repo —
`NOTES.md`, `agent-log/mistakes.md`, and the commit messages, which carry the
measurements rather than the conversation.

## What was removed

Only secrets, and one piece of unrelated private data:

- the Appwrite API key, wherever it appeared, including truncated prefixes I had
  printed. Reading `.env` put it into a tool result twenty-seven times
- session secrets and one-time sign-in codes
- the absolute path of my home directory, replaced with `~`
- one directory listing of an unrelated personal folder, marked in place as
  `[trimmed: a listing of an unrelated personal folder]`

Everything else is as it happened. Nothing was summarised and nothing was
reordered. Screenshots I pasted appear as `[screenshot]`; the model's internal
reasoning is not part of the transcript.

## How it went

| Where | What was happening |
|---|---|
| Start of part 1 | Reading the brief. No code for the first two prompts: I wanted the traps in it named before starting. |
| Part 1 | The starter repo, Appwrite and GitHub, then sign-in, the header, log out, the Function client and onboarding. |
| Part 1, later | The visual direction. I rejected the first pass for looking generated and the second for its palette. Three languages and the appearance control came out of this. |
| Part 2 | "It is slow" — changing a theme was measured at 814ms, because it asked Appwrite who was signed in in order to read back a cookie. |
| Part 2 | NOTES, README, and an audit before submitting. |
| Part 2 | Four rounds of real bugs, every one found by using the app rather than reading it: a redirect that typechecked and went nowhere, mutations with no failure path, a cache that would not refresh, a code input that dropped digits under fast typing. |

Those four are the part worth reading. They are written up against the commits
that fixed them in `../mistakes.md`.
