# Quality & Security

## Critical Rules (אסור לעבור)

### Auth Guard
- כל API route חייב לקרוא `getAuthUserId()` בהתחלה
- אם userId = null → return new Response(null, { status: 401 })
- אסור לעולם לדלג על בדיקה זו

### User Isolation
- כל Prisma query חייב לכלול `WHERE: { userId }` (בדוק בכל update/delete גם)
- אסור שתלמיד אחד יוכל להיגש ל-session של תלמיד אחר
- אסור שמורה אחד יוכל להיגע ב-profile של מורה אחר

### Webhook Security
- `POST /api/webhooks/clerk` חייב לוודא Svix signature
- `const signature = req.headers.get("svix-id")`
- `const payload = await verifySignature(...)`
- חייב לזרוק error אם הסימנטור לא תקין

### SSE Routes
- כל SSE stream (`/api/interview/[id]/answer`, `/generate`) חייב לטפל client disconnect
- אל תשאיר streams פתוחים — handle `socket.on('close')` או `response.on('close')`
- אל תשלח ערכים לאחר ש-client disconnected

### AI Routes Timeout
- כל route שקורא ל-Gemini צריך `export const maxDuration = 60;`
- Hobby Vercel = 10s timeout → לא מספיק
- Pro plan דרוש ל-production

## Testing
- כתוב tests ל-happy path + edge cases + error states
- בדוק user isolation (תלמיד לא יכול לגשת לsession של אחר)
- בדוק auth guard (ללא userId → 401)

## Code Review Checklist
- אין secrets/credentials בקוד (env vars only)
- אין console.log/error שנשאר בproduction
- error handling בכל async operation
- input validation בכל API boundary
- getAuthUserId() בכל route
- userId בכל Prisma WHERE
