extends RigidBody3D

const FLAP_FORCE := 8.0
const MAX_ROTATION := 45.0

var alive := true

func _physics_process(delta: float) -> void:
	if not alive:
		return
	
	# Rotation based on velocity
	var vel_y := linear_velocity.y
	var target_rot := clampf(vel_y * 5.0, -MAX_ROTATION, MAX_ROTATION)
	rotation_degrees.z = lerp(rotation_degrees.z, target_rot, 10.0 * delta)

func flap() -> void:
	if not alive:
		return
	linear_velocity = Vector3(0, FLAP_FORCE, 0)

func die() -> void:
	alive = false
	set_physics_process(false)
