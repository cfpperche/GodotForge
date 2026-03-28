"""GodotForge Chat Panel for Blender — sidebar panel that talks to MCP /chat endpoint."""

import json
import threading
import urllib.request
import urllib.error

import bpy
from bpy.types import Panel, Operator, PropertyGroup
from bpy.props import StringProperty, CollectionProperty, IntProperty

MCP_HOST = "127.0.0.1"
MCP_PORT = 6980


class GodotForgeChatMessage(PropertyGroup):
    role: StringProperty(name="Role")  # type: ignore
    text: StringProperty(name="Text")  # type: ignore


class GodotForgeChatProperties(PropertyGroup):
    input_text: StringProperty(name="Message", default="")  # type: ignore
    messages: CollectionProperty(type=GodotForgeChatMessage)  # type: ignore
    is_busy: bpy.props.BoolProperty(name="Busy", default=False)  # type: ignore
    session_id: StringProperty(name="Session", default="blender-default")  # type: ignore


class GODOTFORGE_OT_send_message(Operator):
    bl_idname = "godotforge.send_message"
    bl_label = "Send"
    bl_description = "Send message to GodotForge AI"

    def execute(self, context):
        props = context.scene.godotforge_chat
        message = props.input_text.strip()
        if not message or props.is_busy:
            return {"CANCELLED"}

        # Add user message
        msg = props.messages.add()
        msg.role = "user"
        msg.text = message
        props.input_text = ""
        props.is_busy = True

        # Send in background thread
        thread = threading.Thread(
            target=_send_chat_request,
            args=(message, props.session_id),
            daemon=True,
        )
        thread.start()

        return {"FINISHED"}


class GODOTFORGE_OT_clear_chat(Operator):
    bl_idname = "godotforge.clear_chat"
    bl_label = "Clear"
    bl_description = "Clear chat history"

    def execute(self, context):
        props = context.scene.godotforge_chat
        props.messages.clear()
        return {"FINISHED"}


class GODOTFORGE_PT_chat_panel(Panel):
    bl_label = "GodotForge Chat"
    bl_idname = "GODOTFORGE_PT_chat_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "GodotForge"

    def draw(self, context):
        layout = self.layout
        props = context.scene.godotforge_chat

        # Messages area
        box = layout.box()
        if len(props.messages) == 0:
            box.label(text="No messages yet. Start chatting!")
        else:
            for msg in props.messages:
                row = box.row()
                icon = "USER" if msg.role == "user" else "LIGHT" if msg.role == "assistant" else "TOOL_SETTINGS"
                # Wrap long text
                lines = _wrap_text(msg.text, 45)
                for i, line in enumerate(lines):
                    if i == 0:
                        row = box.row()
                        row.label(text=f"[{msg.role}] {line}", icon=icon)
                    else:
                        row = box.row()
                        row.label(text=f"  {line}")

        # Input area
        layout.separator()
        row = layout.row(align=True)
        row.prop(props, "input_text", text="")
        row.operator("godotforge.send_message", text="", icon="PLAY")

        if props.is_busy:
            layout.label(text="Thinking...", icon="TIME")

        # Clear button
        layout.operator("godotforge.clear_chat", text="Clear Chat", icon="TRASH")


def _send_chat_request(message: str, session_id: str) -> None:
    """Send chat request to MCP HTTP server (runs in background thread)."""
    try:
        url = f"http://{MCP_HOST}:{MCP_PORT}/chat"
        data = json.dumps({"message": message, "session_id": session_id}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        req.timeout = 300  # 5 min for tool loops

        with urllib.request.urlopen(req, timeout=300) as resp:
            body = json.loads(resp.read().decode("utf-8"))

        response_text = body.get("response", "")
        tool_calls = body.get("tool_calls", [])
        error = body.get("error", "")

        # Schedule UI update on main thread
        def _update():
            props = bpy.context.scene.godotforge_chat

            # Add tool call summaries
            for tc in tool_calls:
                msg = props.messages.add()
                msg.role = "tool"
                status = "✗" if tc.get("is_error") else "✓"
                msg.text = f"{status} {tc['name']}: {tc.get('result', '')[:100]}"

            # Add assistant response
            if response_text:
                msg = props.messages.add()
                msg.role = "assistant"
                msg.text = response_text[:2000]

            if error:
                msg = props.messages.add()
                msg.role = "error"
                msg.text = f"Error: {error}"

            props.is_busy = False

            # Force UI redraw
            for area in bpy.context.screen.areas:
                if area.type == "VIEW_3D":
                    area.tag_redraw()

            return None

        bpy.app.timers.register(_update, first_interval=0.0)

    except Exception as e:
        def _error():
            props = bpy.context.scene.godotforge_chat
            msg = props.messages.add()
            msg.role = "error"
            msg.text = f"Connection error: {e}"
            props.is_busy = False
            return None

        bpy.app.timers.register(_error, first_interval=0.0)


def _wrap_text(text: str, width: int) -> list[str]:
    """Simple text wrapper for Blender UI labels."""
    lines = []
    for line in text.split("\n"):
        while len(line) > width:
            split_at = line.rfind(" ", 0, width)
            if split_at == -1:
                split_at = width
            lines.append(line[:split_at])
            line = line[split_at:].lstrip()
        lines.append(line)
    return lines[:20]  # Cap at 20 lines per message


# Registration lists for __init__.py
CLASSES = [
    GodotForgeChatMessage,
    GodotForgeChatProperties,
    GODOTFORGE_OT_send_message,
    GODOTFORGE_OT_clear_chat,
    GODOTFORGE_PT_chat_panel,
]


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.godotforge_chat = bpy.props.PointerProperty(type=GodotForgeChatProperties)


def unregister():
    del bpy.types.Scene.godotforge_chat
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
