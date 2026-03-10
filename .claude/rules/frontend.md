# Frontend

## Component Architecture
- components/ → UI reusable (shadcn + custom)
- הפרד presentation מ-logic (custom hooks)
- RTL layout בתוך layout.tsx → `dir="rtl"` + `lang="he"`

## Styling
- Tailwind 4 + shadcn/ui + Lucide icons
- cn() לכל שילוב classNames
- אסור inline styles – תמיד Tailwind classes
- RTL: Tailwind auto-flips (text-right ↔ text-left)

## State Management
- Props + hooks ל-local state
- Context אם צריך state shared across pages
- Query state דרך API routes + React state

## Performance
- use React.memo רק כשיש מדידה שמצדיקה
- dynamic import לcomponents כבדים
- אסור useEffect לdata fetching

## Accessibility
- aria-label על אייקונים בלי טקסט
- keyboard navigation לכל interactive element
- lang="he" + dir="rtl" בעברית

## Hebrew UI
- **כל הטקסט חייב להיות בעברית** (לא Engrish)
- עברית בלבד בממשק — אפילו error messages
