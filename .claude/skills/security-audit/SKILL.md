---
name: security-audit
description: Performs a comprehensive security audit on any codebase. This skill should be used when the user asks to audit security, check for vulnerabilities, scan for secrets, or review security posture — it covers source code (OWASP Top 10, injection, auth), secrets/credentials, dependencies (CVEs), and configuration files (env, Docker, CI/CD, HTTP headers).
---

# Security Audit

Run a full security audit across four areas: source code, secrets, dependencies, and configuration.

## When to Use This Skill

- User says "audit security", "check for vulnerabilities", "security review", "scan for secrets"
- Before a production release
- After onboarding to a new codebase
- Periodic security health check

## Audit Workflow

### Step 1: Detect project type

Before auditing, identify:
- Language/framework (Node, Python, Go, etc.)
- Package manager (`package.json`, `pyproject.toml`, `go.mod`, etc.)
- Deployment type (Docker, cloud, serverless)

### Step 2: Run secrets scan

Search for hardcoded secrets in source code:

```bash
grep -r "CLERK_SECRET" . --include="*.ts" --include="*.js" --include="*.tsx"
grep -r "GEMINI_API_KEY" . --include="*.ts" --include="*.js"
grep -r "DATABASE_URL" . --exclude-dir=node_modules --include="*.ts"
```

Review every match — report confirmed findings as **Critical**.

### Step 3: Audit source code

Apply this checklist to high-risk areas:

**Authentication / Authorization:**
- [ ] Every API route calls `getAuthUserId()` at the start
- [ ] Auth check happens BEFORE any logic
- [ ] 401 response if user is not authenticated
- [ ] User can only access their own data (userId check in Prisma WHERE)

**Database:**
- [ ] All queries include userId in WHERE clause
- [ ] No SQL injection via string concatenation
- [ ] Prepared statements / ORMs used (Prisma ✓)

**Input Validation:**
- [ ] All API parameters validated before use
- [ ] Request body validated against schema
- [ ] No XSS via unsanitized HTML

**Secrets / Credentials:**
- [ ] No hardcoded API keys
- [ ] No secrets in git history (use git-secrets / pre-commit hooks)
- [ ] Env vars used for all sensitive data
- [ ] .env files are gitignored

**External API Calls:**
- [ ] API keys passed via Authorization header
- [ ] Request/response validation
- [ ] Timeout handling
- [ ] Error handling (no credential leakage in error messages)

### Step 4: Audit dependencies

Run security audit for npm:

```bash
npm audit --json
```

Parse output and report CVEs by severity (Critical → High → Medium).

### Step 5: Audit configuration

Check all config files: `.env*`, `vercel.json`, `next.config.ts`, CI/CD workflows.

- [ ] No secrets in config files (use env vars)
- [ ] Vercel environment variables properly configured
- [ ] AI route timeouts set (`maxDuration = 60`)
- [ ] CORS / headers configured if needed

### Step 6: Produce report

Output a structured report:

```
# Security Audit Report
Date: <date>
Project: gilu-naot-app

## Summary
| Category      | Critical | High | Medium | Low |
|---------------|----------|------|--------|-----|
| Secrets       |          |      |        |     |
| Code          |          |      |        |     |
| Dependencies  |          |      |        |     |
| Configuration |          |      |        |     |

## Critical Findings
### [CRIT-1] <title>
- **Location:** file:line
- **Issue:** description
- **Risk:** what can an attacker do
- **Fix:** concrete remediation

## High Findings
...

## Passed Checks
- List what was verified and found clean

## Recommendations
Prioritized action list
```

## Rules

- Never suggest disabling security controls as a "fix"
- Always provide a concrete remediation, not just "fix this"
- False positives are acceptable — mark them as `[FP - reason]` rather than omitting
- If a dependency audit command fails, note it and suggest installation
