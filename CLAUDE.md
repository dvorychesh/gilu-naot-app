# CLAUDE.md — גילוי נאות

## פרויקט
מערכת AI לגילוי פוטנציאל תלמידים — מורים מראיינים תלמידים, AI מייצר פרופיל פדגוגי.
Next.js 16 + App Router + Prisma + PostgreSQL + Clerk + Gemini AI.
Runtime: **Node / npm** (לא Bun).

## Tech Stack
Next.js 16 · TypeScript 5 · Tailwind 4 · shadcn/ui (RTL) · Prisma 7 · PostgreSQL · Clerk · @google/genai (Gemini 2.0 Flash)

## מבנה תיקיות
```
src/app/              → routes + pages (App Router)
src/app/api/          → API routes (interview, class-profile, webhooks)
src/components/       → UI components (shadcn + custom)
src/lib/              → auth, db, claude (Gemini), interview-state, questions
src/hooks/            → useInterview
prisma/               → schema.prisma
```

## ארכיטקטורה מרכזית

### Interview Flow (state machine)
```
POST /api/interview/sessions          → create session + Q1
POST /api/interview/[id]/answer       → SSE stream: quality check → transition
POST /api/interview/[id]/generate     → SSE stream: profile generation
```

### SSE Events (answer route)
- `checking` → AI quality check רץ
- `quality` → { passed: boolean }
- `follow_up` → { text: string } — שאלת המשך אם נכשל
- `next_question` → { index, text, topic }
- `complete` → כל 10 שאלות נענו
- `error` → שגיאה

### Auth
- `getAuthUserId()` ב-`src/lib/auth.ts`
- DEV_MODE: ללא Clerk keys → מחזיר "dev-user-001" אוטומטית
- Production: Clerk auth() → userId

### Webhook
- `POST /api/webhooks/clerk` → user.created → upsert ל-DB
- מאומת עם **Svix** signature (לא header פשוט)

## Rules
- RTL: `dir="rtl"` בלייאאוט, `"rtl": true` ב-components.json
- ממשק בעברית בלבד
- אסור console.log/console.error בפרודקשן
- כל API route חייב לבדוק `getAuthUserId()` → 401 אם null
- Prisma WHERE תמיד כולל userId לאיזולציית משתמשים

## פקודות
- `npm run dev`    → dev server
- `npm run build`  → prisma generate + next build
- `npx prisma studio` → GUI לDB
- `npx prisma migrate dev` → migration חדשה

## Rules
כל הכללים מפוצלים לקבצים ב-.claude/rules/ – נטענים אוטומטית:

- @.claude/rules/code-style.md       → naming, formatting, early returns
- @.claude/rules/frontend.md         → components, styling, state, a11y, RTL
- @.claude/rules/quality.md          → testing, security, auth guard, user isolation
- @.claude/rules/workflow.md         → תהליך עבודה, npm commands, migrations
- @.claude/rules/git.md              → commits, branching, PRs
- @.claude/rules/prompt-engineering.md → זהות, chain-of-thought

## Skills
שימוש ב-skills לפי סוג המשימה:

| משימה | Skill |
|-------|-------|
| פיצ'ר חדש מ-A עד Z | `/gsd` |
| בניית UI component / page | `/frontend-design` |
| code review לקוד / PR | `/code-review` |
| באג / שגיאה / behavior לא צפוי | `/systematic-debugging` |
| security audit ו-vulnerabilities | `/security-audit` |
| טסטינג E2E בדפדפן | `/webapp-testing` |

## Gotchas (פרויקט-ספציפי)
- `src/lib/claude.ts` = Gemini AI client (לא Anthropic Claude — שם מטעה, אל תשנה בלי לבדוק imports)
- Middleware = passthrough בלבד — auth guard הוא per-route ב-`src/lib/auth.ts`
- DEV_MODE ב-auth.ts → מחזיר "dev-user-001" (לא צריך Clerk keys לדיוג מקומי)
- Prisma enums (SchoolTrack, InterviewStatus) חייבים להישאר — שינוי דורש migration

## ENV נדרש
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
DATABASE_URL=
DIRECT_URL=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## Vercel
- Hobby plan = max 10s timeout → לא מספיק (generate צריך 60s) → **Pro plan נדרש**
- vercel.json מגדיר timeouts לפונקציות AI
