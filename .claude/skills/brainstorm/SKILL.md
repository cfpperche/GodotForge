---
name: brainstorm
description: Generate game concepts through structured 6-phase brainstorming — creative discovery, concepts, core loops, pillars, player types, scope.
user_invocable: true
---

# /brainstorm [genre|theme|open]

Structured game concept generation in 6 phases. Ask questions between phases — never assume.

## Phase 1: Creative Discovery
Ask the user:
- What **feelings** should the game evoke? (tension, wonder, mastery, relaxation)
- Any **inspirations**? (games, movies, books, experiences)
- **Constraints**: platform, team size, timeline, engine features to use
- **Anti-inspirations**: what should the game NOT be?

## Phase 2: Generate 3 Concepts
Create 3 distinct concepts using different methods:
1. **Verb-first**: start with a core action (climb, connect, transform, absorb)
2. **Mashup**: combine 2 unexpected genres/themes (farming + horror, puzzle + FPS)
3. **Experience-first**: start with the desired player feeling and work backward

For each: one-paragraph pitch, core mechanic, unique hook.

## Phase 3: Core Loop (pick 1 concept with user)
Define the loop at 4 timescales:
- **Moment** (3-10 seconds): what does the player DO each moment?
- **Session** (5-30 minutes): what keeps them playing this session?
- **Day** (across sessions): what brings them back tomorrow?
- **Long-term** (weeks+): what gives lasting satisfaction?

## Phase 4: Design Pillars
- Define 3-4 pillars (what the game IS): e.g., "Responsive movement", "Emergent discovery"
- Define 2-3 anti-pillars (what the game is NOT): e.g., "Not a grind", "Not competitive"
- Every feature decision should support at least one pillar

## Phase 5: Player Type Validation
- Map the concept to player types: Achiever, Explorer, Socializer, Killer (Bartle)
- Casual ↔ Core spectrum: where does this sit?
- Identify primary audience and secondary audience

## Phase 6: Scope & MVP
- Estimate scope: small (1-2 months), medium (3-6 months), large (6-12 months)
- Define MVP: minimum set of features for the core loop to work
- List cut candidates: features that can be added post-MVP
- Identify highest-risk element: what needs prototyping first?

## Output
Write `docs/game-concept.md` with all 6 phases documented.
