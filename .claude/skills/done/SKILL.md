---
name: done
description: Finish the current piece of WrongTrain work, check it, and add it to the shared version so the other person gets it.
---

Finish their current piece of work. Don't ask git questions, and don't explain git unless something
goes wrong.

1. Do the `/catchup` steps (`.claude/skills/catchup/SKILL.md`), so their work sits on top of the
   latest shared version.
2. Check it, in `app/`: `npm run build`, `npm test`, `npm run e2e`. If something fails, fix it
   when the fix is clear and small; otherwise say in plain words what's broken and stop.
   Tests that only failed because the design changed (new wording, a moved button) get updated
   to match.
3. Add it to the shared version: `git checkout app`, `git merge --no-ff <branch>` with a plain
   message saying what the work was, `git push origin app`. Then delete the branch here and on
   GitHub.
4. Never touch `main`. That is the live website.
5. Reply in one or two lines: it's in, and the other person gets it with `/catchup`. Remind
   them that `/start` begins the next thing.

If GitHub asks for a password, stop and give them the one-time setup steps from "Working
together" in CLAUDE.md.
