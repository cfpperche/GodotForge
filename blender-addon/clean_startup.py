"""GodotForge Blender startup script — clears default scene objects."""
import bpy

# Delete all default objects (cube, camera, light)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Ensure addon is enabled
try:
    bpy.ops.preferences.addon_enable(module="godotforge")
except Exception:
    pass

print("[GodotForge] Clean scene ready")
