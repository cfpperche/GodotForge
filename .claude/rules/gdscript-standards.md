# GDScript Standards

## File Structure (this order)
1. class_name (if needed)
2. extends
3. Constants and enums
4. Signals
5. @export variables
6. Public variables
7. Private variables (prefix _)
8. @onready variables
9. _ready() / _enter_tree()
10. _process() / _physics_process()
11. Public methods
12. Private methods (prefix _)
13. Signal callbacks (prefix _on_)

## Naming
- PascalCase: classes, enums, nodes
- snake_case: functions, variables, signals
- UPPER_SNAKE_CASE: constants
- Signals: past tense (health_changed, enemy_died, level_completed)

## Typing
- Static typing mandatory: `var health: int = 100`, `func take_damage(amount: int) -> void:`
- @onready with types: `@onready var sprite: Sprite2D = $Visuals/Sprite`
- Never use untyped Arrays — use `Array[Enemy]` or typed alternatives

## Patterns
- Composition over inheritance (max depth: 3 levels after Node base)
- Signals for upward communication, direct methods for downward
- Cache node references in @onready, never get_node() in _process()
- Use Resources for structured data (not Dictionaries)
- Autoloads sparingly: EventBus, GameManager, SaveManager, AudioManager only
