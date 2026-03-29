# Self-Review Checklist — Frontend Polish

Run before delivering output. Every item must pass.

- [ ] Every button has `transition-all duration-300` and a hover state
- [ ] Every card/clickable area has hover lift effect (`hover:-translate-y-0.5`)
- [ ] Input fields have `focus:ring-2 focus:ring-primary/30` focus states
- [ ] Loading states use skeleton (`animate-pulse`) or spinner, not blank
- [ ] Empty states have icon + title + description + action CTA
- [ ] No hardcoded colors — all from CSS variables / Tailwind design tokens
- [ ] Text hierarchy is clear: heading > subheading > body > caption sizes
- [ ] Dark theme: no invisible text, all contrast ratios meet WCAG AA (4.5:1)
- [ ] Glassmorphism: `backdrop-blur` + semi-transparent bg on overlays/sidebars
- [ ] Mobile responsive: sidebar collapses, text scales, touch targets >= 44px
- [ ] `scroll-smooth` on html element
- [ ] Ambient background or subtle gradient (not flat solid color)
- [ ] Toast notifications for success/error feedback (sonner or similar)
- [ ] `motion-reduce:` prefix on all animations for accessibility
- [ ] Project builds without errors after changes
- [ ] No `!important` added
