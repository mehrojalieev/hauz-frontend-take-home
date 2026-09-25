# Agent log

TASK.md asks for the agent prompts or exported sessions, plus a short list of
things the agent got wrong that I caught. This folder is that record, kept as I
worked rather than reconstructed at the end.

- `mistakes.md` — what the agent got wrong, how I noticed, and the commit that
  fixed it. Written the moment each one came up.
- `sessions/session.md` — the whole session, exported in full: every prompt,
  every reply, the commands run and the files changed. It is a translation: the
  conversation happened in Uzbek and has been translated into English so it can
  be read, without being summarised or tidied up. The README there says what was
  removed, which is secrets and one piece of unrelated private data, and nothing
  else.

I used an agent throughout. The working rule was one commit at a time: ask for a
slice, read what came back, question anything I could not explain, fix it, then
commit. Where the agent and I disagreed, the reasoning is in the commit message
or in NOTES.md.
