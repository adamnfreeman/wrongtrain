---
name: start
description: Start a new piece of work on WrongTrain, e.g. "/start restyle the Today page". Gets the latest version first and keeps this work apart from the other person's.
argument-hint: what you're about to work on
---

The person wants to start: $ARGUMENTS

Do this without asking them git questions, and don't explain git unless something goes wrong.

1. Work out who they are from `git config user.email` in this repo. If it is empty, ask one
   question, "Are you Adam or Andrea?", then set `user.name` and `user.email` in this repo
   (Adam Freeman, adam@thefreemans.io; Andrea Freeman, andrea@thefreemans.io).
2. If there are unsaved changes, do the `/save` steps first (`.claude/skills/save/SKILL.md`).
3. Get the latest: `git fetch origin`, `git checkout app`, `git pull origin app`.
4. Make a branch off `app` named for the person and the work, e.g. `andrea/today-restyle`.
5. Reply in one or two lines: what they're working on, and that they can begin. If they gave no
   description, ask what they'll work on.

If GitHub asks for a password, stop and give them the one-time setup steps from "Working
together" in CLAUDE.md.
