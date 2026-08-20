---
name: inspect-project
description: Inspect a local software project and explain its architecture, setup, runtime flow, configuration, and major risks. Use when a user asks to understand, audit, onboard to, or assess an unfamiliar repository before making changes.
---

# Inspect Project

## Workflow

1. Read repository instructions and the primary README before inspecting implementation details.
2. Map top-level directories, package manifests, entry points, configuration, storage, and generated artifacts.
3. Trace one important runtime path from user input to its final side effect.
4. Check local readiness without exposing secrets: dependencies, ignored configuration, build output, tests, and running services.
5. Separate observed facts from inferences and unresolved questions.
6. Report the architecture, startup procedure, current state, and highest-impact risks concisely.

## Safety

- Treat inspection as read-only unless the user explicitly requests changes.
- Never print secret values; report only whether required keys exist.
- Preserve unrelated worktree changes and untracked runtime data.
- Prefer repository-native validation commands when they are available.
