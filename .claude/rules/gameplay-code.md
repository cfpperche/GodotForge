# Gameplay Code Standards

- ALL gameplay values from external config or @export, NEVER hardcoded. Gravity, speed, jump force, spawn rates — all tunable.
- Use delta time for ALL time-dependent calculations. Never assume fixed frame rate.
- NO direct UI references from gameplay code. Use signals or EventBus autoload.
- State machines: use enum + match for simple states, node-based StateMachine for complex ones.
- Every gameplay system needs: clear state diagram, transition table, and edge case handling.
- Player input via Input.is_action_pressed() / Input.is_action_just_pressed(), never raw key codes.
- Collision layers and masks must be documented. Use named constants, not magic numbers.
- Physics: RigidBody for simulation-driven, CharacterBody for player-controlled. Never mix.
- Object pooling for frequently instantiated objects (bullets, particles, enemies).
- Disable _process/_physics_process with set_process(false) when object is inactive.
