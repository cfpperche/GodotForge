extends Node2D

const SPEED := 200.0
var scored := false

func _process(delta: float) -> void:
	position.x -= SPEED * delta

	# Check if bird passed this pipe for scoring
	if not scored and position.x < 100:
		scored = true
		var main = get_tree().current_scene
		if main.has_method("add_score"):
			main.add_score()

	if position.x < -100:
		queue_free()
