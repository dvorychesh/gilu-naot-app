---
name: code-review
description: Reviews code changes, pull requests, or any staged/modified files against the project's quality standards. This skill should be used when the user asks to review a PR, review changed files, or get feedback on code quality — it checks for security issues, code style, performance, and adherence to project conventions.
---

# Code Review

Perform a thorough code review against project standards: security, correctness, style, performance, and maintainability.

## When to Use This Skill

- User says "review this PR", "review my code", "check this file", "what do you think about X"
- Before merging a feature branch
- After implementing a feature to catch issues early

## Review Process

### Step 1: Gather context

If reviewing a PR or branch, run:
```bash
git diff main...HEAD
git log main...HEAD --oneline
```

If reviewing specific files, read them first.

### Step 2: Apply the checklist

Go through every category below. Report issues grouped by severity: **Critical** → **Warning** → **Suggestion**.

---

## Review Checklist

### Security (Critical — block merge if found)
- [ ] No secrets, API keys, or credentials in code
- [ ] No `console.log` with sensitive data
- [ ] All API routes have `getAuthUserId()` check
- [ ] All Prisma queries include `WHERE { userId }`
- [ ] Input validated at every system boundary (user input, API params)
- [ ] No SQL injection / XSS / command injection vectors
- [ ] Clerk webhook verifies Svix signature

### Correctness
- [ ] Logic matches the stated requirement
- [ ] Edge cases handled (null, undefined, empty array, 0)
- [ ] Error handling on every async operation
- [ ] No silent failures (empty catch blocks)
- [ ] Types are accurate — no `any` without justification

### Code Style (project conventions)
- [ ] Named exports only (no `export default`)
- [ ] No `enum` — use string literal unions
- [ ] Arrow function components
- [ ] Early returns over nested conditionals
- [ ] `cn()` used for conditional classNames
- [ ] No inline styles
- [ ] No unnecessary type annotations (use inference)

### Performance
- [ ] No useEffect for data fetching
- [ ] `React.memo` only where measured and justified
- [ ] Heavy components use dynamic import
- [ ] No N+1 query patterns
- [ ] Images use `next/image`

### Maintainability
- [ ] Functions are small and single-responsibility
- [ ] No duplication that should be abstracted
- [ ] JSDoc on public functions and hooks
- [ ] No dead code or commented-out blocks

### Hebrew UI
- [ ] All user-facing text is in Hebrew (no English labels)
- [ ] Error messages are in Hebrew

### Tests
- [ ] New logic has unit tests (vitest + Testing Library)
- [ ] Happy path + edge cases + error states covered
- [ ] No tests that only test implementation details

---

## Output Format

Present findings as:

```
## Critical
- [file:line] Issue description + why it matters + suggested fix

## Warnings
- [file:line] Issue description + suggestion

## Suggestions
- [file:line] Optional improvement

## Summary
X critical issues, Y warnings, Z suggestions.
[Overall assessment: ready to merge / needs changes]
```

If no issues found in a category, omit it.
