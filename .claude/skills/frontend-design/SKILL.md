---
name: frontend-design
description: Build polished frontend UI components and pages for Next.js projects using shadcn/ui, Tailwind CSS, and Lucide icons. This skill should be used when the user asks to build a UI component, page, form, or any visual element — it applies the project's design conventions, accessibility rules, and state management patterns.
---

# Frontend Design

Build polished, accessible UI components and pages using the project stack: Next.js 16 + App Router + Tailwind 4 + shadcn/ui + Lucide icons.

## When to Use This Skill

- User asks to build a component, page, form, table, modal, or any UI element
- User says "design X", "create a UI for X", "build the X page/component"
- User wants to improve or redesign an existing visual element

## Design Process

### Step 1: Understand the requirement

Before writing any code, clarify:
- What is this component/page for? (domain context)
- What data does it display or collect?
- Are there existing components in `src/components/` to reuse?

Check the project structure first:
```
src/components/  → reusable UI (shadcn + custom)
src/app/         → pages and layouts
```

### Step 2: Plan the component structure

- Separate **presentation** from **logic** — use custom hooks for data/state
- Prefer **composition** over large monolithic components
- Identify which shadcn/ui primitives to use (Button, Card, Dialog, Form, etc.)

### Step 3: Build the component

**Styling rules:**
- Always use `cn()` from `@/lib/utils` for conditional classNames
- Never use inline styles — Tailwind classes only
- Use Lucide icons with `aria-label` when no visible text

**Component rules:**
- Named exports only (no `export default`)
- Arrow function components
- TypeScript types via inference — avoid redundant type annotations
- Early returns over nested conditionals
- Always handle loading + error states in server components

**State management:**
- Local UI state → `useState`
- Server state + fetching → React state + API routes
- Global mutable state → Context or Zustand

**Accessibility:**
- Every icon-only button needs `aria-label`
- All interactive elements must be keyboard-navigable
- Use semantic HTML (button, nav, main, section)
- Hebrew text is RTL — handled by Tailwind auto-flip

### Step 4: Review checklist

Before finishing, verify:
- [ ] Component is exported as named export
- [ ] No inline styles
- [ ] Loading and error states handled
- [ ] Accessible (aria-labels, keyboard nav)
- [ ] `cn()` used for all conditional classes

## Common Patterns

### Card with actions
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const ExampleCard = ({ title, className }: { title: string; className?: string }) => (
  <Card className={cn('w-full', className)}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Button>פעולה</Button>
    </CardContent>
  </Card>
)
```

### Form
Use `react-hook-form` + `zod` + shadcn/ui Form components.
