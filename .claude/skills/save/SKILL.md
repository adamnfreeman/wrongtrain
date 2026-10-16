---
name: save
description: Save the WrongTrain work in progress and back it up to GitHub. Safe to run any time; doesn't affect the other person.
---

Save their work. Don't ask git questions, and don't explain git unless something goes wrong.

1. If they are on `app` itself (not a branch of their own), first make a branch as `/start`
   does (`.claude/skills/start/SKILL.md`), named from what the changes are about.
2. Commit every change, except junk files: `.DS_Store`, and iCloud copies with " 2", " 13" and
   the like in the name. Write a short, plain message about what changed. Commit as the person
   in `git config user.email`; if that is empty, ask "Are you Adam or Andrea?" first, as `/start`
   does.
3. Push the branch: `git push -u origin <branch>`.
4. Reply in one line: saved, and what was in it.

If GitHub asks for a password, stop and give them the one-time setup steps from "Working
together" in CLAUDE.md.
