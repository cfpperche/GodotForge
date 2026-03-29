# Anti-Patterns — Frontend Polish

## 1. Layout animation
**Pattern:** Animating `width`, `height`, or `top`/`left` — causes layout thrashing.
**Instead:** Use `transform: scale()`, `translate()`, or `max-height` with `overflow: hidden`.

## 2. !important overrides
**Pattern:** Using `!important` to fix styling conflicts.
**Instead:** Fix specificity with proper selector order or Tailwind's `!` prefix sparingly.

## 3. Invisible text
**Pattern:** Using `opacity: 0.1` or `opacity: 0.2` on text content.
**Instead:** Minimum `opacity-30` for any readable text, or use `text-muted-foreground`.

## 4. Hardcoded colors
**Pattern:** Using `text-white`, `bg-gray-900`, or hex values in components.
**Instead:** Use design system tokens: `text-foreground`, `bg-card`, `border-border`.

## 5. No transition on state changes
**Pattern:** Elements snap between states (hover, active, open/closed).
**Instead:** Add `transition-all duration-300` to every interactive element.

## 6. Missing loading state
**Pattern:** Blank screen or frozen UI during async operations.
**Instead:** Show `animate-pulse` skeleton or `Loader2` spinner immediately.

## 7. Empty void
**Pattern:** Showing nothing when a list/section has no data.
**Instead:** Show empty state with icon, message, and action button.

## 8. setTimeout for animations
**Pattern:** Using `setTimeout` to sequence visual changes.
**Instead:** Use CSS transitions, `transition-delay`, or `requestAnimationFrame`.

## 9. Fixed pixel breakpoints
**Pattern:** Using `@media (max-width: 768px)` in CSS.
**Instead:** Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`).

## 10. Ignoring reduced motion
**Pattern:** All animations play regardless of user preference.
**Instead:** Add `motion-reduce:transition-none` or `motion-reduce:animate-none`.

## 11. Heavy animation library for simple effects
**Pattern:** Installing framer-motion for a single hover effect.
**Instead:** Use CSS transitions + Tailwind utilities. Only add libraries for complex sequences.

## 12. Multiple stacked shadows
**Pattern:** Applying 3+ `box-shadow` values that compound.
**Instead:** Use one composite shadow or `shadow-lg` with color modifier.
