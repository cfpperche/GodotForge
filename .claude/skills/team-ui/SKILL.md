---
name: team-ui
description: Multi-agent pipeline to design and implement a UI/UX system — from interaction design through implementation, visual polish, and accessibility audit.
user_invocable: true
---

# /team-ui [UI system description]

Orchestrate a full UI/UX pipeline using specialized agents. **Ask for user approval between each phase.**

## Phase 1: Requirements Gathering

Ask the user:
- **UI scope**: HUD, menu system, inventory, dialogue UI, settings, full game UI
- **Input methods**: keyboard+mouse, gamepad, touch, all
- **Style reference**: minimalist, diegetic, skeuomorphic, pixel art
- **Accessibility requirements**: colorblind, motor, cognitive
- **Platform targets**: desktop, mobile, console

## Phase 2: UI Design → @systems-designer

Delegate to **systems-designer** agent:
- Design screen flow diagram (all screens and transitions)
- Define HUD elements with purpose and visibility rules
- Specify input mapping for all actions
- Define state management (what data drives each screen)
- Output: UI design document with screen flow, wireframes, input map

**🔄 Present to user for approval before proceeding.**

## Phase 3: Implementation → @gameplay-programmer

Delegate to **gameplay-programmer** agent:
- Implement UI using Godot Control nodes
- Setup theme resources (.tres) for consistent styling
- Wire signals for UI ↔ game state communication
- Apply `.claude/rules/ui-code.md` — UI never owns game state
- Implement input handling for all supported methods

**🔄 Present to user for approval before proceeding.**

## Phase 4: Visual Polish → @technical-artist

Delegate to **technical-artist** agent:
- Create/refine theme resources (colors, fonts, margins)
- Add transitions and animations (Tween for procedural, AnimationPlayer for complex)
- Setup CanvasLayer for HUD separation
- Ensure visual consistency across all screens

**🔄 Present to user for approval before proceeding.**

## Phase 5: Accessibility Audit → @accessibility-specialist

Delegate to **accessibility-specialist** agent:
- Run full accessibility checklist
- Verify keyboard/gamepad navigation (focus_neighbor_*)
- Check color contrast ratios (≥4.5:1 text, ≥3:1 UI)
- Verify text readability at min resolution
- Test without mouse

## Phase 6: Summary

Present final deliverables checklist:
- [ ] Screen flow diagram
- [ ] All UI scenes (.tscn) with Control nodes
- [ ] Theme resource (.tres)
- [ ] Input mapping for keyboard + gamepad
- [ ] Transitions and animations
- [ ] Accessibility audit passed
- [ ] Focus navigation complete
