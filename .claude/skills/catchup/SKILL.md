---
name: catchup
description: Bring the other person's finished WrongTrain work into what you're working on, and say what changed.
---

Bring the latest finished work into theirs. Don't ask git questions, and don't explain git unless
something goes wrong.

1. If there are unsaved changes, do the `/save` steps first (`.claude/skills/save/SKILL.md`).
2. `git fetch origin`. On `app`: `git pull origin app`. On their own branch: merge `origin/app`
   into it.
3. If the two people changed the same lines, settle it yourself, keeping what both meant. Ask
   only when the two changes really can't both be kept, in one plain question with a button for
   each choice. Then commit the merge and push the branch.
4. Reply briefly: what the other person changed since last time (from the new commits, in plain
   words, not commit hashes), or "Nothing new".
