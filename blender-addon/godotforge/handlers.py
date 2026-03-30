"""Blender tool handlers — each function receives args dict and returns {result, is_error?}."""

import json
import math
import os
from functools import wraps
from typing import Any

import bpy
import mathutils


def safe_handler(fn):
    """Wrap handler in try/except to return structured errors instead of raw tracebacks."""
    @wraps(fn)
    def wrapper(args):
        try:
            return fn(args)
        except Exception as e:
            return {"result": f"{fn.__name__} failed: {e}", "is_error": True}
    return wrapper


# ==================== Modeling ====================

@safe_handler
def create_mesh(args: dict) -> dict:
    """Create a mesh primitive (cube, sphere, cylinder, plane, cone, torus, uv_sphere, ico_sphere)."""
    mesh_type = args.get("type", "cube").lower()
    name = args.get("name", "")
    location = _to_vector(args.get("location", [0, 0, 0]))
    scale = _to_vector(args.get("scale", [1, 1, 1]))

    ops = {
        "cube": bpy.ops.mesh.primitive_cube_add,
        "sphere": bpy.ops.mesh.primitive_uv_sphere_add,
        "uv_sphere": bpy.ops.mesh.primitive_uv_sphere_add,
        "ico_sphere": bpy.ops.mesh.primitive_ico_sphere_add,
        "cylinder": bpy.ops.mesh.primitive_cylinder_add,
        "plane": bpy.ops.mesh.primitive_plane_add,
        "cone": bpy.ops.mesh.primitive_cone_add,
        "torus": bpy.ops.mesh.primitive_torus_add,
    }

    op = ops.get(mesh_type)
    if not op:
        return {"result": f"Unknown mesh type: {mesh_type}. Options: {', '.join(ops.keys())}", "is_error": True}

    op(location=location)
    obj = bpy.context.active_object
    obj.scale = scale
    if name:
        obj.name = name

    return {"result": f"Created {mesh_type} '{obj.name}' at {list(location)}"}


@safe_handler
def delete_object(args: dict) -> dict:
    """Delete an object by name."""
    name = args.get("name", "")
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    bpy.data.objects.remove(obj, do_unlink=True)
    return {"result": f"Deleted object '{name}'"}


@safe_handler
def duplicate_object(args: dict) -> dict:
    """Duplicate an object."""
    name = args.get("name", "")
    new_name = args.get("new_name", "")
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    new_obj = obj.copy()
    new_obj.data = obj.data.copy()
    if new_name:
        new_obj.name = new_name
    bpy.context.collection.objects.link(new_obj)
    return {"result": f"Duplicated '{name}' as '{new_obj.name}'"}


@safe_handler
def transform(args: dict) -> dict:
    """Move, rotate, or scale an object."""
    name = args.get("name", "")
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    if "location" in args:
        obj.location = _to_vector(args["location"])
    if "rotation" in args:
        rot = args["rotation"]
        obj.rotation_euler = mathutils.Euler(
            [math.radians(r) for r in _to_list(rot)], 'XYZ'
        )
    if "scale" in args:
        obj.scale = _to_vector(args["scale"])

    changes = []
    if "location" in args: changes.append(f"location={list(obj.location)}")
    if "rotation" in args: changes.append(f"rotation={list(obj.rotation_euler)}")
    if "scale" in args: changes.append(f"scale={list(obj.scale)}")

    return {"result": f"Transformed '{name}': {', '.join(changes)}"}


@safe_handler
def modify(args: dict) -> dict:
    """Apply a modifier to an object (mirror, array, solidify, bevel, subsurf)."""
    name = args.get("name", "")
    modifier_type = args.get("modifier", "").upper()
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    valid_types = {"MIRROR", "ARRAY", "SOLIDIFY", "BEVEL", "SUBSURF", "BOOLEAN", "DECIMATE"}
    if modifier_type not in valid_types:
        return {"result": f"Unknown modifier: {modifier_type}. Options: {', '.join(valid_types)}", "is_error": True}

    mod = obj.modifiers.new(name=modifier_type.title(), type=modifier_type)

    # Apply optional properties
    props = args.get("properties", {})
    for key, value in props.items():
        if hasattr(mod, key):
            setattr(mod, key, value)

    return {"result": f"Added {modifier_type} modifier to '{name}'"}


@safe_handler
def boolean(args: dict) -> dict:
    """Boolean operation between two objects."""
    name = args.get("name", "")
    target = args.get("target", "")
    operation = args.get("operation", "DIFFERENCE").upper()
    obj = bpy.data.objects.get(name)
    target_obj = bpy.data.objects.get(target)

    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}
    if not target_obj:
        return {"result": f"Target not found: {target}", "is_error": True}

    mod = obj.modifiers.new(name="Boolean", type='BOOLEAN')
    mod.operation = operation
    mod.object = target_obj

    return {"result": f"Added boolean {operation} on '{name}' with '{target}'"}


@safe_handler
def join_objects(args: dict) -> dict:
    """Join multiple objects into one."""
    names = args.get("names", [])
    if len(names) < 2:
        return {"result": "Need at least 2 object names to join.", "is_error": True}

    objects = []
    for n in names:
        obj = bpy.data.objects.get(n)
        if not obj:
            return {"result": f"Object not found: {n}", "is_error": True}
        objects.append(obj)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()

    return {"result": f"Joined {len(names)} objects into '{objects[0].name}'"}


# ==================== Materials ====================

@safe_handler
def create_material(args: dict) -> dict:
    """Create a PBR material."""
    name = args.get("name", "Material")
    color = args.get("color", [0.8, 0.8, 0.8, 1.0])
    metallic = args.get("metallic", 0.0)
    roughness = args.get("roughness", 0.5)

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = _to_color(color)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness

    return {"result": f"Created material '{mat.name}' (color={color}, metallic={metallic}, roughness={roughness})"}


@safe_handler
def assign_material(args: dict) -> dict:
    """Assign a material to an object."""
    obj_name = args.get("object", "")
    mat_name = args.get("material", "")

    obj = bpy.data.objects.get(obj_name)
    if not obj:
        return {"result": f"Object not found: {obj_name}", "is_error": True}

    mat = bpy.data.materials.get(mat_name)
    if not mat:
        return {"result": f"Material not found: {mat_name}", "is_error": True}

    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)

    return {"result": f"Assigned material '{mat_name}' to '{obj_name}'"}


@safe_handler
def list_materials(args: dict) -> dict:
    """List all materials in the scene."""
    mats = [{"name": m.name, "users": m.users} for m in bpy.data.materials]
    return {"result": json.dumps(mats)}


# ==================== Scene & Info ====================

@safe_handler
def get_scene_objects(args: dict) -> dict:
    """List all objects in the scene."""
    objects = []
    for obj in bpy.context.scene.objects:
        objects.append({
            "name": obj.name,
            "type": obj.type,
            "location": list(obj.location),
            "visible": obj.visible_get(),
        })
    return {"result": json.dumps(objects)}


@safe_handler
def get_object_properties(args: dict) -> dict:
    """Get properties of an object."""
    name = args.get("name", "")
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    props = {
        "name": obj.name,
        "type": obj.type,
        "location": list(obj.location),
        "rotation": list(obj.rotation_euler),
        "scale": list(obj.scale),
        "dimensions": list(obj.dimensions),
        "visible": obj.visible_get(),
        "materials": [m.name for m in obj.data.materials] if hasattr(obj.data, "materials") else [],
    }

    if obj.type == 'MESH':
        props["vertices"] = len(obj.data.vertices)
        props["faces"] = len(obj.data.polygons)
        props["edges"] = len(obj.data.edges)

    return {"result": json.dumps(props)}


@safe_handler
def get_blender_info(args: dict) -> dict:
    """Get Blender version and scene info."""
    info = {
        "blender_version": ".".join(str(v) for v in bpy.app.version),
        "file": bpy.data.filepath or "(unsaved)",
        "objects": len(bpy.context.scene.objects),
        "materials": len(bpy.data.materials),
        "collections": [c.name for c in bpy.data.collections],
    }
    return {"result": json.dumps(info)}


# ==================== Export ====================

@safe_handler
def export_gltf(args: dict) -> dict:
    """Export scene or selected objects as GLTF/GLB."""
    filepath = args.get("filepath", "")
    if not filepath:
        return {"result": "filepath is required", "is_error": True}

    selected_only = args.get("selected_only", False)
    file_format = "GLB" if filepath.endswith(".glb") else "GLTF_SEPARATE"

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format=file_format,
        use_selection=selected_only,
        export_apply=True,
    )

    return {"result": f"Exported to {filepath}"}


@safe_handler
def export_for_godot(args: dict) -> dict:
    """Export optimized for Godot (GLB + naming conventions)."""
    filepath = args.get("filepath", "")
    if not filepath:
        return {"result": "filepath is required", "is_error": True}

    if not filepath.endswith(".glb"):
        filepath += ".glb"

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True,
        export_yup=True,
    )

    return {"result": f"Exported for Godot: {filepath}"}


# ==================== UV ====================

@safe_handler
def unwrap_uv(args: dict) -> dict:
    """UV unwrap the active object."""
    name = args.get("name", "")
    method = args.get("method", "smart").lower()

    obj = bpy.data.objects.get(name)
    if not obj or obj.type != 'MESH':
        return {"result": f"Mesh object not found: {name}", "is_error": True}

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')

    if method == "smart":
        bpy.ops.uv.smart_project()
    else:
        bpy.ops.uv.unwrap()

    bpy.ops.object.mode_set(mode='OBJECT')
    return {"result": f"UV unwrapped '{name}' with method '{method}'"}


# ==================== Animation ====================

@safe_handler
def create_armature(args: dict) -> dict:
    """Create an armature (skeleton)."""
    name = args.get("name", "Armature")
    location = _to_vector(args.get("location", [0, 0, 0]))

    bpy.ops.object.armature_add(location=location)
    armature = bpy.context.active_object
    armature.name = name
    return {"result": f"Created armature '{armature.name}'"}


@safe_handler
def add_bone(args: dict) -> dict:
    """Add a bone to an armature."""
    armature_name = args.get("armature", "")
    bone_name = args.get("name", "Bone")
    parent_bone = args.get("parent", "")
    head = _to_vector(args.get("head", [0, 0, 0]))
    tail = _to_vector(args.get("tail", [0, 0, 1]))

    armature = bpy.data.objects.get(armature_name)
    if not armature or armature.type != 'ARMATURE':
        return {"result": f"Armature not found: {armature_name}", "is_error": True}

    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='EDIT')

    bone = armature.data.edit_bones.new(bone_name)
    bone.head = head
    bone.tail = tail

    if parent_bone:
        parent = armature.data.edit_bones.get(parent_bone)
        if parent:
            bone.parent = parent

    bpy.ops.object.mode_set(mode='OBJECT')
    return {"result": f"Added bone '{bone_name}' to armature '{armature_name}'"}


@safe_handler
def parent_to_armature(args: dict) -> dict:
    """Parent a mesh to an armature with automatic weights."""
    mesh_name = args.get("mesh", "")
    armature_name = args.get("armature", "")

    mesh_obj = bpy.data.objects.get(mesh_name)
    armature_obj = bpy.data.objects.get(armature_name)

    if not mesh_obj:
        return {"result": f"Mesh not found: {mesh_name}", "is_error": True}
    if not armature_obj or armature_obj.type != 'ARMATURE':
        return {"result": f"Armature not found: {armature_name}", "is_error": True}

    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    return {"result": f"Parented '{mesh_name}' to '{armature_name}' with auto weights"}


@safe_handler
def insert_keyframe(args: dict) -> dict:
    """Insert a keyframe on an object."""
    name = args.get("name", "")
    data_path = args.get("data_path", "location")
    frame = args.get("frame", 1)

    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    # Set frame
    bpy.context.scene.frame_set(int(frame))

    # Set values if provided
    if "value" in args:
        val = args["value"]
        if data_path == "location":
            obj.location = _to_vector(val)
        elif data_path == "rotation_euler":
            obj.rotation_euler = mathutils.Euler(
                [math.radians(r) for r in _to_list(val)], 'XYZ'
            )
        elif data_path == "scale":
            obj.scale = _to_vector(val)

    obj.keyframe_insert(data_path=data_path, frame=int(frame))
    return {"result": f"Keyframe inserted on '{name}'.{data_path} at frame {frame}"}


@safe_handler
def create_animation(args: dict) -> dict:
    """Create a new animation action."""
    name = args.get("name", "Action")
    obj_name = args.get("object", "")
    frame_start = args.get("frame_start", 1)
    frame_end = args.get("frame_end", 60)

    obj = bpy.data.objects.get(obj_name)
    if not obj:
        return {"result": f"Object not found: {obj_name}", "is_error": True}

    action = bpy.data.actions.new(name=name)
    obj.animation_data_create()
    obj.animation_data.action = action

    bpy.context.scene.frame_start = int(frame_start)
    bpy.context.scene.frame_end = int(frame_end)

    return {"result": f"Created action '{name}' on '{obj_name}' (frames {frame_start}-{frame_end})"}


@safe_handler
def set_animation_range(args: dict) -> dict:
    """Set the frame range for the scene."""
    frame_start = args.get("frame_start", 1)
    frame_end = args.get("frame_end", 60)

    bpy.context.scene.frame_start = int(frame_start)
    bpy.context.scene.frame_end = int(frame_end)
    return {"result": f"Animation range set: {frame_start}-{frame_end}"}


@safe_handler
def list_animations(args: dict) -> dict:
    """List all animation actions."""
    actions = []
    for action in bpy.data.actions:
        actions.append({
            "name": action.name,
            "frame_range": list(action.frame_range),
            "users": action.users,
        })
    return {"result": json.dumps(actions)}


@safe_handler
def auto_weight_paint(args: dict) -> dict:
    """Auto weight paint a mesh to its armature parent."""
    mesh_name = args.get("mesh", "")

    mesh_obj = bpy.data.objects.get(mesh_name)
    if not mesh_obj or mesh_obj.type != 'MESH':
        return {"result": f"Mesh not found: {mesh_name}", "is_error": True}

    if not mesh_obj.parent or mesh_obj.parent.type != 'ARMATURE':
        return {"result": f"'{mesh_name}' is not parented to an armature", "is_error": True}

    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_obj
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.paint.weight_from_bones(type='AUTOMATIC')
    bpy.ops.object.mode_set(mode='OBJECT')

    return {"result": f"Auto weight paint applied to '{mesh_name}'"}


# ==================== Scene & Render ====================

@safe_handler
def set_camera(args: dict) -> dict:
    """Add or configure a camera."""
    name = args.get("name", "Camera")
    location = _to_vector(args.get("location", [0, -10, 5]))
    rotation = args.get("rotation", [60, 0, 0])
    focal_length = args.get("focal_length", 50.0)

    cam = bpy.data.objects.get(name)
    if not cam or cam.type != 'CAMERA':
        bpy.ops.object.camera_add(location=location)
        cam = bpy.context.active_object
        cam.name = name
    else:
        cam.location = location

    cam.rotation_euler = mathutils.Euler(
        [math.radians(r) for r in _to_list(rotation)], 'XYZ'
    )
    cam.data.lens = float(focal_length)
    bpy.context.scene.camera = cam

    return {"result": f"Camera '{cam.name}' set at {list(cam.location)}, focal={focal_length}mm"}


@safe_handler
def set_light(args: dict) -> dict:
    """Add or configure a light."""
    name = args.get("name", "Light")
    light_type = args.get("type", "SUN").upper()
    location = _to_vector(args.get("location", [0, 0, 5]))
    energy = args.get("energy", 1.0)
    color = args.get("color", [1, 1, 1])

    valid_types = {"POINT", "SUN", "SPOT", "AREA"}
    if light_type not in valid_types:
        return {"result": f"Unknown light type: {light_type}. Options: {', '.join(valid_types)}", "is_error": True}

    light = bpy.data.objects.get(name)
    if not light or light.type != 'LIGHT':
        bpy.ops.object.light_add(type=light_type, location=location)
        light = bpy.context.active_object
        light.name = name
    else:
        light.location = location

    light.data.energy = float(energy)
    light.data.color = tuple(float(c) for c in _to_list(color))[:3]

    return {"result": f"Light '{light.name}' ({light_type}) energy={energy}"}


@safe_handler
def render_image(args: dict) -> dict:
    """Render an image to file."""
    filepath = args.get("filepath", "//render.png")
    resolution_x = args.get("resolution_x", 1920)
    resolution_y = args.get("resolution_y", 1080)
    samples = args.get("samples", 64)

    bpy.context.scene.render.resolution_x = int(resolution_x)
    bpy.context.scene.render.resolution_y = int(resolution_y)
    bpy.context.scene.render.filepath = filepath

    if bpy.context.scene.render.engine == 'CYCLES':
        bpy.context.scene.cycles.samples = int(samples)
    elif bpy.context.scene.render.engine == 'BLENDER_EEVEE_NEXT':
        bpy.context.scene.eevee.taa_render_samples = int(samples)

    bpy.ops.render.render(write_still=True)
    return {"result": f"Rendered to {filepath} ({resolution_x}x{resolution_y}, {samples} samples)"}


@safe_handler
def set_render_settings(args: dict) -> dict:
    """Configure render settings."""
    engine = args.get("engine", "").upper()
    resolution_x = args.get("resolution_x")
    resolution_y = args.get("resolution_y")
    samples = args.get("samples")

    if engine:
        engines = {"EEVEE": "BLENDER_EEVEE_NEXT", "CYCLES": "CYCLES", "WORKBENCH": "BLENDER_WORKBENCH"}
        if engine in engines:
            bpy.context.scene.render.engine = engines[engine]
        elif engine in engines.values():
            bpy.context.scene.render.engine = engine
        else:
            return {"result": f"Unknown engine: {engine}. Options: EEVEE, CYCLES, WORKBENCH", "is_error": True}

    if resolution_x:
        bpy.context.scene.render.resolution_x = int(resolution_x)
    if resolution_y:
        bpy.context.scene.render.resolution_y = int(resolution_y)
    if samples:
        if bpy.context.scene.render.engine == 'CYCLES':
            bpy.context.scene.cycles.samples = int(samples)

    return {"result": f"Render settings: engine={bpy.context.scene.render.engine}, "
            f"{bpy.context.scene.render.resolution_x}x{bpy.context.scene.render.resolution_y}"}


# ==================== Texture ====================

@safe_handler
def set_material_texture(args: dict) -> dict:
    """Assign a texture image to a material channel."""
    mat_name = args.get("material", "")
    channel = args.get("channel", "base_color").lower()
    filepath = args.get("filepath", "")

    mat = bpy.data.materials.get(mat_name)
    if not mat:
        return {"result": f"Material not found: {mat_name}", "is_error": True}

    if not mat.use_nodes:
        mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if not bsdf:
        return {"result": "No Principled BSDF found in material", "is_error": True}

    # Create image texture node
    tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    img = bpy.data.images.load(filepath)
    tex_node.image = img

    channel_map = {
        "base_color": "Base Color",
        "albedo": "Base Color",
        "metallic": "Metallic",
        "roughness": "Roughness",
        "normal": "Normal",
    }

    input_name = channel_map.get(channel, channel)

    if channel == "normal":
        normal_node = mat.node_tree.nodes.new('ShaderNodeNormalMap')
        mat.node_tree.links.new(tex_node.outputs['Color'], normal_node.inputs['Color'])
        mat.node_tree.links.new(normal_node.outputs['Normal'], bsdf.inputs['Normal'])
    else:
        mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs[input_name])

    return {"result": f"Texture '{filepath}' assigned to '{mat_name}'.{channel}"}


@safe_handler
def bake_textures(args: dict) -> dict:
    """Bake textures (diffuse, normal, AO) for the active object."""
    name = args.get("name", "")
    bake_type = args.get("type", "DIFFUSE").upper()
    resolution = args.get("resolution", 1024)
    filepath = args.get("filepath", "//bake.png")

    obj = bpy.data.objects.get(name)
    if not obj or obj.type != 'MESH':
        return {"result": f"Mesh not found: {name}", "is_error": True}

    # Ensure Cycles for baking
    bpy.context.scene.render.engine = 'CYCLES'

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Create bake image
    img = bpy.data.images.new("BakeResult", int(resolution), int(resolution))

    # Assign image to active material's node
    if obj.data.materials:
        mat = obj.data.materials[0]
        if mat.use_nodes:
            tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex_node.image = img
            mat.node_tree.nodes.active = tex_node

    bpy.ops.object.bake(type=bake_type)
    img.filepath_raw = filepath
    img.save()

    return {"result": f"Baked {bake_type} for '{name}' → {filepath} ({resolution}x{resolution})"}


@safe_handler
def delete_material(args: dict) -> dict:
    """Remove a material."""
    name = args.get("name", "")
    mat = bpy.data.materials.get(name)
    if not mat:
        return {"result": f"Material not found: {name}", "is_error": True}

    bpy.data.materials.remove(mat)
    return {"result": f"Deleted material '{name}'"}


# ==================== Collision helpers (for Godot) ====================

@safe_handler
def generate_collision_hints(args: dict) -> dict:
    """Generate collision shape metadata for Godot import.

    Naming convention: -col (convex), -colonly (collision only),
    -convcol (convex collision only). Godot auto-detects these on GLTF import.
    """
    name = args.get("name", "")
    collision_type = args.get("type", "convex").lower()

    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    suffix_map = {
        "convex": "-col",
        "collision_only": "-colonly",
        "convex_only": "-convcol",
        "trimesh": "-trimesh",
    }

    suffix = suffix_map.get(collision_type, "-col")

    # Duplicate object with collision suffix for Godot to detect
    new_obj = obj.copy()
    new_obj.data = obj.data.copy()
    new_obj.name = f"{obj.name}{suffix}"
    new_obj.display_type = 'WIRE'
    bpy.context.collection.objects.link(new_obj)

    return {"result": f"Created collision hint '{new_obj.name}' (Godot will create {collision_type} shape on import)"}


# ==================== Export enhanced ====================

@safe_handler
def export_with_animations(args: dict) -> dict:
    """Export GLTF/GLB with animations included."""
    filepath = args.get("filepath", "")
    if not filepath:
        return {"result": "filepath is required", "is_error": True}

    if not filepath.endswith(".glb"):
        filepath += ".glb"

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True,
        export_yup=True,
        export_animations=True,
        export_skins=True,
    )

    return {"result": f"Exported with animations: {filepath}"}


@safe_handler
def export_fbx(args: dict) -> dict:
    """Export as FBX."""
    filepath = args.get("filepath", "")
    if not filepath:
        return {"result": "filepath is required", "is_error": True}

    bpy.ops.export_scene.fbx(
        filepath=filepath,
        use_selection=args.get("selected_only", False),
        apply_scale_options='FBX_SCALE_ALL',
    )

    return {"result": f"Exported FBX: {filepath}"}


# ==================== Modeling extras ====================

@safe_handler
def extrude(args: dict) -> dict:
    """Extrude faces of a mesh."""
    name = args.get("name", "")
    offset = args.get("offset", 1.0)

    obj = bpy.data.objects.get(name)
    if not obj or obj.type != 'MESH':
        return {"result": f"Mesh not found: {name}", "is_error": True}

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.extrude_region_move(
        TRANSFORM_OT_translate={"value": (0, 0, float(offset))}
    )
    bpy.ops.object.mode_set(mode='OBJECT')

    return {"result": f"Extruded '{name}' by {offset}"}


@safe_handler
def subdivide(args: dict) -> dict:
    """Subdivide a mesh."""
    name = args.get("name", "")
    cuts = args.get("cuts", 1)

    obj = bpy.data.objects.get(name)
    if not obj or obj.type != 'MESH':
        return {"result": f"Mesh not found: {name}", "is_error": True}

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=int(cuts))
    bpy.ops.object.mode_set(mode='OBJECT')

    return {"result": f"Subdivided '{name}' with {cuts} cuts"}


@safe_handler
def set_origin(args: dict) -> dict:
    """Set the origin of an object."""
    name = args.get("name", "")
    origin_type = args.get("type", "ORIGIN_CENTER_OF_MASS").upper()

    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    valid = {"ORIGIN_GEOMETRY", "ORIGIN_CENTER_OF_MASS", "ORIGIN_CENTER_OF_VOLUME", "ORIGIN_CURSOR", "GEOMETRY_ORIGIN"}
    if origin_type not in valid:
        return {"result": f"Unknown origin type. Options: {', '.join(valid)}", "is_error": True}

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type=origin_type)

    return {"result": f"Origin set for '{name}': {origin_type}"}


@safe_handler
def separate_mesh(args: dict) -> dict:
    """Separate mesh by loose parts or materials."""
    name = args.get("name", "")
    method = args.get("method", "LOOSE").upper()

    obj = bpy.data.objects.get(name)
    if not obj or obj.type != 'MESH':
        return {"result": f"Mesh not found: {name}", "is_error": True}

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')

    if method == "MATERIAL":
        bpy.ops.mesh.separate(type='MATERIAL')
    else:
        bpy.ops.mesh.separate(type='LOOSE')

    bpy.ops.object.mode_set(mode='OBJECT')
    return {"result": f"Separated '{name}' by {method}"}


# ==================== Script (escape hatch) ====================

@safe_handler
def execute_python(args: dict) -> dict:
    """Execute arbitrary Python/bpy code."""
    code = args.get("code", "")
    if not code:
        return {"result": "code is required", "is_error": True}

    local_vars: dict[str, Any] = {"_result": ""}
    exec(code, {"bpy": bpy, "mathutils": mathutils, "math": math, "os": os, "json": json}, local_vars)

    return {"result": str(local_vars.get("_result", "Executed successfully."))}


# ==================== API Extraction ====================

@safe_handler
def extract_api(args: dict) -> dict:
    """Extract bpy API documentation and save as JSON for RAG indexing."""
    filepath = args.get("filepath", "")
    if not filepath:
        return {"result": "filepath is required", "is_error": True}

    from . import api_extractor
    result = api_extractor.extract_and_save(filepath)
    return {"result": result}


# ==================== Helpers ====================

def _to_vector(v) -> tuple:
    if isinstance(v, (list, tuple)):
        return tuple(float(x) for x in v)
    if isinstance(v, dict):
        return (float(v.get("x", 0)), float(v.get("y", 0)), float(v.get("z", 0)))
    return (0.0, 0.0, 0.0)


def _to_list(v) -> list:
    if isinstance(v, (list, tuple)):
        return [float(x) for x in v]
    if isinstance(v, dict):
        return [float(v.get("x", 0)), float(v.get("y", 0)), float(v.get("z", 0))]
    return [0.0, 0.0, 0.0]


def _to_color(v) -> tuple:
    if isinstance(v, (list, tuple)):
        c = [float(x) for x in v]
        while len(c) < 4:
            c.append(1.0)
        return tuple(c[:4])
    return (0.8, 0.8, 0.8, 1.0)
