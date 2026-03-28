"""Blender tool handlers — each function receives args dict and returns {result, is_error?}."""

import json
import math
import os
from typing import Any

import bpy
import mathutils


# ==================== Modeling ====================

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


def delete_object(args: dict) -> dict:
    """Delete an object by name."""
    name = args.get("name", "")
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"result": f"Object not found: {name}", "is_error": True}

    bpy.data.objects.remove(obj, do_unlink=True)
    return {"result": f"Deleted object '{name}'"}


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


def list_materials(args: dict) -> dict:
    """List all materials in the scene."""
    mats = [{"name": m.name, "users": m.users} for m in bpy.data.materials]
    return {"result": json.dumps(mats)}


# ==================== Scene & Info ====================

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


# ==================== Script (escape hatch) ====================

def execute_python(args: dict) -> dict:
    """Execute arbitrary Python/bpy code."""
    code = args.get("code", "")
    if not code:
        return {"result": "code is required", "is_error": True}

    local_vars: dict[str, Any] = {"_result": ""}
    exec(code, {"bpy": bpy, "mathutils": mathutils, "math": math, "os": os, "json": json}, local_vars)

    return {"result": str(local_vars.get("_result", "Executed successfully."))}


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
