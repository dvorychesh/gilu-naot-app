# Workflow

## תהליך לכל משימה (תמיד 1→5)
1. **תכנן** – ארכיטקטורה + קבצים שישתנו
2. **כתוב טסטים קודם** (אם מתאים)
3. **יישם**
4. **וודא** – types + format
5. **הצע** – review points + אפשרויות שיפור

## פקודות (Node/npm)
- `npm install` → התקנה
- `npm run dev` → dev server
- `npm run build` → build + prisma generate
- `npx prisma migrate dev` → migration חדשה
- `npx prisma studio` → GUI לDB
- `npx prisma generate` → generate Prisma client

## Database
- כל שינוי schema → צור migration: `npx prisma migrate dev --name [feature_name]`
- לא מאומתק: ישירות שינוי schema בלי migration
- review migration בזהירות — אל תשמור passwords/secrets

## DEV_MODE (Local Development)
1. צור `.env.local` עם:
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
2. `DEV_MODE=true` בקוד auth.ts → "dev-user-001" (לא צריך Clerk)

## Type Check
- `npx tsc --noEmit` → בדוק TypeScript errors
- אל תדלג עליה

## Memory
- כל למידה חדשה על הפרויקט/העדפות → עדכן מיד MEMORY.md (ללא שאלה)
