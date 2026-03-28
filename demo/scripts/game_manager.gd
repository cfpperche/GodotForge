extends Node2D

enum State { MENU, PLAYING, GAME_OVER }

var state: State = State.MENU
var score: int = 0

@onready var bird: CharacterBody2D = $Bird
@onready var pipes: Node2D = $Pipes
@onready var spawner: Node = $PipeSpawner
@onready var spawn_timer: Timer = $PipeSpawner/SpawnTimer
@onready var score_label: Label = $UI/ScoreLabel
@onready var message_label: Label = $UI/MessageLabel

func _ready() -> void:
	bird.died.connect(_on_bird_died)
	spawn_timer.timeout.connect(_on_spawn_timer)
	set_state(State.MENU)

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("flap"):
		match state:
			State.MENU:
				set_state(State.PLAYING)
				bird.flap()
			State.PLAYING:
				bird.flap()
			State.GAME_OVER:
				restart()

func set_state(new_state: State) -> void:
	state = new_state
	match state:
		State.MENU:
			message_label.text = "Press SPACE to play!"
			message_label.visible = true
			score_label.visible = false
			bird.set_physics_process(false)
			spawn_timer.stop()
		State.PLAYING:
			message_label.visible = false
			score_label.visible = true
			score = 0
			score_label.text = str(score)
			bird.set_physics_process(true)
			spawn_timer.start()
		State.GAME_OVER:
			message_label.text = "Game Over!\nScore: " + str(score) + "\n\nPress SPACE to restart"
			message_label.visible = true
			spawn_timer.stop()

func _on_bird_died() -> void:
	set_state(State.GAME_OVER)

func _on_spawn_timer() -> void:
	if state != State.PLAYING:
		return
	var pipe_scene := preload("res://scenes/pipe.tscn")
	var pipe := pipe_scene.instantiate()
	pipe.position = Vector2(550, randf_range(150, 500))
	pipe.tree_exiting.connect(_cleanup_pipe.bind(pipe))
	pipes.add_child(pipe)

func _cleanup_pipe(_pipe: Node) -> void:
	pass

func add_score() -> void:
	score += 1
	score_label.text = str(score)

func restart() -> void:
	# Clear pipes
	for pipe in pipes.get_children():
		pipe.queue_free()
	bird.reset()
	set_state(State.PLAYING)
	bird.flap()
