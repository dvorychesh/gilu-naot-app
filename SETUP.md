# מדריך הפעלה ופריסה — גילוי נאות

## שלב 1: Clerk (אימות משתמשים)

1. צרי חשבון ב-[clerk.com](https://clerk.com)
2. צרי Application חדש → שמי אותו "גילוי נאות"
3. בדאשבורד של Clerk:
   - **API Keys** → העתיקי `Publishable Key` ו-`Secret Key`
   - **Webhooks** → Add Endpoint → URL: `https://your-domain.vercel.app/api/webhooks/clerk`
     → Subscribe to: `user.created`
     → העתיקי את ה-`Signing Secret`
   - **Paths** → Sign-in URL: `/sign-in`, Sign-up URL: `/sign-up`

## שלב 2: Vercel + Database

1. דחפי את הקוד ל-GitHub (repo חדש)
2. היכנסי ל-[vercel.com](https://vercel.com) → Import Project → בחרי את ה-repo
3. ב-Storage tab ← Add → Postgres → Create → `gilu-naot-db`
4. Vercel תוסיף אוטומטית `DATABASE_URL` לסביבה

## שלב 3: משתני סביבה (Environment Variables)

הוסיפי ב-Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

> `DATABASE_URL` מתווסף אוטומטית על ידי Vercel Postgres

## שלב 4: Database Migration

אחרי הפריסה הראשונה, הרצי מהמחשב:

```bash
# בתיקיית gilu-naot-app
DATABASE_URL="your-vercel-postgres-url" npx prisma migrate deploy
```

או ב-Vercel Console (Settings → Environment Variables → הוסיפי DATABASE_URL המלא):
```bash
npx prisma db push
```

## שלב 5: דומיין מותאם אישית

ב-Vercel → Settings → Domains → Add Domain → הכניסי את הדומיין שלך
עדכני את ה-DNS records בהתאם להנחיות Vercel.

לאחר שהדומיין פעיל:
- עדכני `NEXT_PUBLIC_APP_URL` למה שבחרת
- עדכני ב-Clerk: Dashboard → Domains → Add Domain

## Vercel Plan

⚠️ **Vercel Pro נדרש** לפונקציות עם זמן תפוגה ארוך (60 שניות לייצור פרופיל).
- Hobby Plan: מקסימום 10 שניות → מספיק לבדיקות
- Pro Plan (~$20/חודש): 60 שניות → נדרש לפרודקשן

## בדיקה מקומית

```bash
# העתיקי .env.example ל-.env.local ומלאי את הערכים
cp .env.example .env.local

npm run dev
# פותח ב-http://localhost:3000
```

## מבנה הפרויקט

```
gilu-naot-app/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # דפים מוגנים
│   │   │   ├── page.tsx          # לוח בקרה
│   │   │   ├── interview/new/    # ראיון חדש
│   │   │   ├── interview/[id]/   # ממשק ראיון
│   │   │   ├── class-profile/    # פרופיל כיתתי
│   │   │   └── history/          # היסטוריה
│   │   ├── api/                  # API routes
│   │   ├── sign-in/              # Clerk auth
│   │   └── sign-up/
│   ├── components/
│   │   ├── interview/            # InterviewChat
│   │   └── profile/              # ProfileView + PDF
│   ├── lib/
│   │   ├── claude.ts             # AI prompts
│   │   ├── questions.ts          # 10 שאלות
│   │   ├── interventions.ts      # בנקי התערבות
│   │   └── interview-state.ts    # State machine
│   └── hooks/
│       └── useInterview.ts       # Client state
├── prisma/
│   └── schema.prisma             # DB schema
└── vercel.json                   # Function timeouts
```
