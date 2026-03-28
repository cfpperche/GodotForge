extends CharacterBody2D

signal died

const GRAVITY := 800.0
const FLAP_FORCE := -300.0
const MAX_FALL := 500.0

var alive := true

func _physics_process(delta: float) -> void:
	if not alive:
		return

	velocity.y += GRAVITY * delta
	velocity.y = minf(velocity.y, MAX_FALL)

	var collision := move_and_slide()

	# Rotate based on velocity
	rotation = clampf(velocity.y / MAX_FALL, -0.5, 0.8) * 0.8

	# Check collision with ground/ceiling/pipes
	if get_slide_collision_count() > 0 and alive:
		die()

func flap() -> void:
	if alive:
		velocity.y = FLAP_FORCE

func die() -> void:
	alive = false
	velocity = Vector2.ZERO
	died.emit()

func reset() -> void:
	position = Vector2(100, 360)
	velocity = Vector2.ZERO
	rotation = 0.0
	alive = true
