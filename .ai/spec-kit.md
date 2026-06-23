# .ai Collaboration Spec Kit

## Purpose

This `.ai/` layer is the shared starting point for CLI agents, AI agents, and developers working on this project. It reduces repeated repo scanning and keeps project state, tasks, decisions, and handoff notes consistent.

## Required Reading Order

Before starting any task:

1. Read `.ai/spec-kit.md`.
2. Read `.ai/CURRENT_STATE.md`.
3. Read `.ai/TASKS.md`.
4. Read `.ai/DECISIONS.md` when the task involves architecture, workflow, data, deployment, or long-lived behavior.
5. Read `.ai/HANDOFF.md` when taking over recent work.
6. Only then inspect task-relevant source files.

Agents should not directly scan the whole repo or make broad changes before reading these collaboration documents.

## Files

- `spec-kit.md`: collaboration rules and update standards.
- `CURRENT_STATE.md`: current project state in present tense.
- `TASKS.md`: task tracking across TODO, DOING, BLOCKED, and DONE.
- `DECISIONS.md`: long-lived technical, architecture, and workflow decisions.
- `HANDOFF.md`: current handoff notes for the latest work session.

## Update Rules

- Update `CURRENT_STATE.md` when the actual project state changes in a way future agents need to know.
- Update `TASKS.md` when task status changes.
- Update `DECISIONS.md` only for durable decisions with rationale and impact.
- Update `HANDOFF.md` at the end of a meaningful work session or before handing off.
- Keep entries concise and avoid unverified repo-wide summaries.

## Handoff Standard

A handoff should state:

- What changed in this round.
- Which files were added or modified.
- What remains incomplete or blocked.
- What the next agent should do first.
- Which files should be read before continuing.

## Collaboration Rules

- Prefer small, verifiable changes.
- Do not invent project state from unknown code.
- Do not change files outside the relevant scope unless necessary.
- Distinguish verified success, unverified changes, and failed verification.
