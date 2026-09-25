# Agent log

TASK.md asks for the agent prompts or exported sessions, plus a short list of
things the agent got wrong that I caught. This folder is that record, kept as I
worked rather than reconstructed at the end.

- `mistakes.md` — what the agent got wrong, how I noticed, and the commit that
  fixed it. Written the moment each one came up.
- `sessions/prompt-log.md` — every prompt I gave, in order, with the tool calls
  each one produced. Translated from Uzbek; the header there says what is
  included and what is not.

I used an agent throughout. The working rule was one commit at a time: ask for a
slice, read what came back, question anything I could not explain, fix it, then
commit. Where the agent and I disagreed, the reasoning is in the commit message
or in NOTES.md.
