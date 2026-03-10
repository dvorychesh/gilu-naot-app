# Code Style

- תמיד named exports (חריג: next.config.ts = `export default`)
- function components + arrow functions
- composition > inheritance
- type inference – אל תכתוב types מיותרים
- JSDoc על כל פונקציה ציבורית + hook
- cn() מ-shadcn לערבוב classNames
- אסור enum חדש – העדף string literal unions (⚠️ existing Prisma enums: אל תשנה ללא migration)
- early returns על פני nested if
