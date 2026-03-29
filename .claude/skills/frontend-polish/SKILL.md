---
name: frontend-polish
description: Systematically polish a React + Tailwind + shadcn/ui web interface to production quality. Covers micro-interactions, loading states, animations, typography, dark theme, glassmorphism, toasts, scroll behavior, empty states, and responsive design. Invoke when user asks to "polish the UI", "make it look professional", "add animations", "improve the frontend", or "make it look AAA".
user-invocable: true
---

# Frontend Polish

Systematically transform a functional React + Tailwind + shadcn/ui interface into a polished, production-quality experience.

## Progress Checklist

Copy this checklist and track progress:

```
Task: Polish frontend UI
- [ ] Step 1: Audit current state
- [ ] Step 2: Global CSS foundations
- [ ] Step 3: Micro-interactions
- [ ] Step 4: Loading & empty states
- [ ] Step 5: Typography & spacing
- [ ] Step 6: Dark theme refinement
- [ ] Step 7: Toasts & feedback
- [ ] Step 8: Responsive polish
- [ ] Step 9: Verify & screenshot
```

## Instructions

### Step 1: Audit current state — 🟢 High freedom: depends on project

Read the main app file, index.css, and 2-3 key components. Identify:
- Missing transitions on interactive elements
- Hardcoded colors instead of CSS variables
- No hover/focus states
- Missing loading indicators
- Poor empty states
- Inconsistent spacing

### Step 2: Global CSS foundations — 🔒 Low freedom: exact patterns

Add to `index.css` (after Tailwind imports):

```css
/* Ambient background */
.ambient-bg {
  position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
}
.ambient-bg::before {
  content: ''; position: absolute; top: -20%; left: -10%; width: 50%; height: 50%;
  background: oklch(0.45 0.15 350 / 0.06); border-radius: 50%; filter: blur(120px);
}
.ambient-bg::after {
  content: ''; position: absolute; bottom: -20%; right: -10%; width: 40%; height: 40%;
  background: oklch(0.5 0.1 260 / 0.06); border-radius: 50%; filter: blur(120px);
}

/* Glow for primary elements */
.glow-primary { box-shadow: 0 0 20px oklch(0.58 0.2 10 / 0.3); }

/* Shimmer loading */
@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
.animate-shimmer {
  background: linear-gradient(90deg, var(--muted) 25%, var(--card) 50%, var(--muted) 75%);
  background-size: 1000px 100%; animation: shimmer 2s infinite;
}
```

Add `scroll-smooth` to html element.

### Step 3: Micro-interactions — 🔓 Medium freedom: apply to all interactive elements

**Buttons**: `transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-95`

**Cards**: `transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30`

**Links**: `transition-colors duration-200 hover:text-primary`

**Inputs focus**: `focus:ring-2 focus:ring-primary/30 transition-all`

**Group hover** for compound elements:
```html
<div class="group">
  <h3 class="group-hover:text-primary transition-colors">Title</h3>
  <span class="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
</div>
```

### Step 4: Loading & empty states — 🔓 Medium freedom: adapt to context

**Loading skeleton**: `animate-pulse` or `animate-shimmer`:
```html
<div class="space-y-3 animate-pulse">
  <div class="h-10 bg-muted rounded-lg" />
  <div class="h-4 bg-muted rounded w-3/4" />
</div>
```

**Button loading**: Replace icon with `<Loader2 class="h-4 w-4 animate-spin" />`

**Empty states**: Center with icon + title + description + CTA button.

### Step 5: Typography & spacing — 🔓 Medium freedom: use existing design system

- Headings: `font-semibold tracking-tight`
- Body: `text-sm leading-relaxed`
- Captions: `text-xs text-muted-foreground`
- Monospace: `font-mono text-xs` for paths, IDs, code
- Spacing: `space-y-4` sections, `gap-2` items
- Use `text-foreground` not `text-white`

### Step 6: Dark theme refinement — 🔓 Medium freedom: match existing palette

- **Glassmorphism**: `bg-card/60 backdrop-blur-xl border-border/50`
- **Gradients**: `bg-gradient-to-br from-primary to-primary/60`
- **Glow dots**: `shadow-[0_0_6px_theme(colors.green.500)]`
- **Stats cards**: unique gradient per category
- **Shadows**: `shadow-lg dark:shadow-primary/10`

### Step 7: Toasts & feedback — 🔒 Low freedom: use sonner

Install `sonner`. Add `<Toaster position="top-right" />` in app root. Use `toast.success()`, `toast.error()`, `toast.promise()`.

### Step 8: Responsive polish — 🔓 Medium freedom: mobile-first

- Sidebar: `md:w-96` desktop, `w-[85vw]` mobile with overlay
- Mobile overlay: `bg-black/60 backdrop-blur-sm`
- Touch targets: `min-h-[44px]`
- Hide non-essential: `hidden sm:flex`

### Step 9: Verify — 🟢 High freedom

Build. Open browser. Check: transitions smooth, loading states present, empty states helpful, dark theme contrast OK, mobile functional, hover effects work.

## Do

- DO add `transition-all duration-300` to every interactive element
- DO use CSS variables from the design system
- DO use `backdrop-blur` for glass effects
- DO respect `prefers-reduced-motion` (`motion-reduce:` prefix)
- DO prefer CSS over JS for simple animations

## Don't

- DON'T add animation libraries unless already in project
- DON'T use `!important`
- DON'T animate layout properties (width, height) — use transform
- DON'T add more than 2 font families
- DON'T polish before the feature works
- DON'T use opacity below 0.3 for text
