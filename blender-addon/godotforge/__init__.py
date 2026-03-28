bl_info = {
    "name": "GodotForge Bridge",
    "author": "GodotForge",
    "version": (0, 2, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > GodotForge",
    "description": "AI Copilot for Blender — chat panel + socket server bridge for GodotForge MCP",
    "category": "Development",
}

import bpy
from .server import GodotForgeServer
from . import panel

_server: GodotForgeServer | None = None


def register():
    global _server
    panel.register()
    _server = GodotForgeServer()
    _server.start()
    print(f"[GodotForge] Blender addon registered — server :8400, chat panel in sidebar")


def unregister():
    global _server
    if _server:
        _server.stop()
        _server = None
    panel.unregister()
    print("[GodotForge] Blender addon unregistered")
