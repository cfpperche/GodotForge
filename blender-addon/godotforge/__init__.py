bl_info = {
    "name": "GodotForge Bridge",
    "author": "GodotForge",
    "version": (0, 1, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > GodotForge",
    "description": "Socket server bridge for GodotForge MCP — receives JSON commands, executes bpy operations",
    "category": "Development",
}

import bpy
from .server import GodotForgeServer

_server: GodotForgeServer | None = None


def register():
    global _server
    _server = GodotForgeServer()
    _server.start()
    print(f"[GodotForge] Blender addon registered, server starting on :8400")


def unregister():
    global _server
    if _server:
        _server.stop()
        _server = None
    print("[GodotForge] Blender addon unregistered")
