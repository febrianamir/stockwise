---
name: code-reviewer
description: Review the current uncommitted changes with the read-only code-reviewer subagent and show its markdown report. Use when the user says "review my code", "run the reviewer", or runs /code-reviewer.
---

# code-reviewer

Hand the review to the project's `code-reviewer` subagent (`.claude/agents/code-reviewer.md`). Don't review the code yourself in the main conversation.

1. Launch the Agent tool with `subagent_type: "code-reviewer"` and a prompt such as:

   > Review the current uncommitted changes in this repository (run git commands from the repo root, `git rev-parse --show-toplevel`) and return your markdown report.

   If the user named specific files, folders or concerns, add them to the prompt so the review focuses on them.

2. When the agent finishes, show the user its report exactly as returned. Don't shorten it or reorder the findings.

3. Do **not** fix any findings or edit any files. After the report, offer in one line to fix the findings if the user wants, and wait for their answer.
