extends Node3D

enum State { MENU, PLAYING, GAME_OVER }

var state := State.MENU
var score := 0
var pipe_speed := 5.0
var pipe_scene: PackedScene

@onready var bird: RigidBody3D = $Bird
@onready var pipes: Node3D = $Pipes
@onready var score_label: Label = $UI/ScoreLabel
@onready var message_label: Label = $UI/MessageLabel
@onready var pipe_timer: Timer = $PipeTimer
@onready var camera: Camera3D = $Camera

func _ready() -> void:
	pipe_scene = load("res://demo-v2/models/pipe.glb")
	bird.freeze = true
	bird.gravity_scale = 2.0
	message_label.text = "Press Space to Start"
	pipe_timer.timeout.connect(_on_pipe_timer)

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_accept"):
		match state:
			State.MENU:
				_start_game()
			State.PLAYING:
				bird.flap()
			State.GAME_OVER:
				_restart()

func _process(delta: float) -> void:
	if state != State.PLAYING:
		return
	
	# Move pipes toward bird
	for pipe in pipes.get_children():
		pipe.position.x -= pipe_speed * delta
		if pipe.position.x < -15.0:
			pipe.queue_free()
	
	# Check if bird fell
	if bird.position.y < -2.0 or bird.position.y > 12.0:
		_game_over()

func _start_game() -> void:
	state = State.PLAYING
	score = 0
	bird.freeze = false
	bird.flap()
	message_label.text = ""
	score_label.text = "Score: 0"
	pipe_timer.start()

func _on_pipe_timer() -> void:
	if state != State.PLAYING:
		return
	_spawn_pipe_pair()

func _spawn_pipe_pair() -> void:
	var gap_y := randf_range(1.0, 5.0)
	var gap_size := 3.0
	
	# Bottom pipe
	var bottom = pipe_scene.instantiate()
	bottom.position = Vector3(15.0, gap_y - gap_size - 3.0, 0)
	pipes.add_child(bottom)
	
	# Top pipe (rotated 180)
	var top = pipe_scene.instantiate()
	top.position = Vector3(15.0, gap_y + gap_size + 3.0, 0)
	top.rotation_degrees.z = 180.0
	pipes.add_child(top)
	
	# Score zone (Area3D)
	var area := Area3D.new()
	area.position = Vector3(15.0, gap_y, 0)
	var col_shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.5, gap_size, 5.0)
	col_shape.shape = box
	area.add_child(col_shape)
	area.body_entered.connect(_on_score_zone.bind(area))
	pipes.add_child(area)

func _on_score_zone(body: Node3D, area: Area3D) -> void:
	if body == bird:
		score += 1
		score_label.text = "Score: " + str(score)
		area.queue_free()

func _game_over() -> void:
	state = State.GAME_OVER
	bird.alive = false
	bird.freeze = true
	pipe_timer.stop()
	message_label.text = "Game Over! Score: " + str(score) + "\nPress Space to Restart"

func _restart() -> void:
	# Clear pipes
	for child in pipes.get_children():
		child.queue_free()
	
	bird.position = Vector3(0, 3, 0)
	bird.linear_velocity = Vector3.ZERO
	bird.rotation_degrees = Vector3.ZERO
	bird.alive = true
	bird.freeze = true
	
	state = State.MENU
	score = 0
	score_label.text = "Score: 0"
	message_label.text = "Press Space to Start"
