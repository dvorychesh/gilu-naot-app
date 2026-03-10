---
name: gsd
description: Starts a new feature or project task end-to-end using a structured "Get Stuff Done" workflow. This skill should be used when the user wants to begin working on a new feature, task, or bug fix — it creates the git branch, scaffolds the necessary files, and sets up a clear implementation plan before writing any code.
---

# GSD – Get Stuff Done

Structured workflow for starting a new feature or task: plan → branch → scaffold → implement.

## When to Use This Skill

- User says "start working on X", "new feature: X", "let's build X", "/gsd X"
- Beginning any non-trivial task that touches multiple files
- User wants a plan before diving into implementation

## GSD Workflow

### Step 1: Clarify the task

Before anything else, make sure the requirement is clear:
- What is the feature/task in one sentence?
- What files will likely change?
- Are there any unknowns that need resolving first?

If unclear, ask **one focused question** before proceeding.

### Step 2: Plan

Output a concise implementation plan:

```
## Plan: <feature name>

**Goal:** <one sentence>

**Files to create:**
- src/app/X/page.tsx
- src/components/X/XComponent.tsx
- ...

**Files to modify:**
- src/lib/...
- ...

**Steps:**
1. ...
2. ...
3. ...

**Open questions / risks:**
- ...
```

Ask the user to confirm the plan before proceeding.

### Step 3: Create git branch

```bash
git checkout -b feat/<feature-name>
```

Use kebab-case. Branch naming:
- `feat/` → new feature
- `fix/` → bug fix
- `chore/` → maintenance

### Step 4: Scaffold files

Create empty/stub files for everything in the plan:
- Components with basic structure (no logic yet)
- Hook stubs with correct signature
- Types file if needed

This makes the scope visible before filling in logic.

### Step 5: Implement

Follow the project workflow:
1. Write tests first (if applicable — vitest + Testing Library)
2. Implement logic
3. Wire up UI
4. Run: `npm run build && npx tsc --noEmit`

### Step 6: Summary

When done:
- List all files created/modified
- Suggest the commit message (Conventional Commits format)
- Flag anything left for follow-up

## Conventions

- Runtime: `npm` (not bun/npx)
- Commits: `feat: / fix: / chore: / refactor: / test: / docs:`
- Named exports only
- No `enum` — string literal unions
