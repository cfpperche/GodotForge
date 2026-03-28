"""Socket server that listens on :8400 for JSON commands from GodotForge MCP."""

import json
import socket
import threading
import traceback
from typing import Any

import bpy

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8400


class GodotForgeServer:
    def __init__(self, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
        self._host = host
        self._port = port
        self._socket: socket.socket | None = None
        self._thread: threading.Thread | None = None
        self._running = False

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._listen, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._socket:
            try:
                self._socket.close()
            except OSError:
                pass

    def _listen(self) -> None:
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._socket.settimeout(1.0)

        for port_offset in range(10):
            port = self._port + port_offset
            try:
                self._socket.bind((self._host, port))
                self._port = port
                break
            except OSError:
                if port_offset == 9:
                    print(f"[GodotForge] Failed to bind to any port in range {self._port}-{port}")
                    return

        self._socket.listen(5)
        print(f"[GodotForge] Blender server listening on {self._host}:{self._port}")

        while self._running:
            try:
                conn, addr = self._socket.accept()
                threading.Thread(target=self._handle_connection, args=(conn,), daemon=True).start()
            except socket.timeout:
                continue
            except OSError:
                break

    def _handle_connection(self, conn: socket.socket) -> None:
        try:
            conn.settimeout(30.0)
            data = b""
            while True:
                chunk = conn.recv(65536)
                if not chunk:
                    break
                data += chunk
                # Try to parse — if valid JSON, process it
                try:
                    request = json.loads(data.decode("utf-8"))
                    break
                except json.JSONDecodeError:
                    continue

            if not data:
                return

            request = json.loads(data.decode("utf-8"))
            result = self._dispatch(request)
            response = json.dumps(result, default=str).encode("utf-8")
            conn.sendall(response)
        except Exception as e:
            error_response = json.dumps({
                "result": f"Server error: {e}",
                "is_error": True,
            }).encode("utf-8")
            try:
                conn.sendall(error_response)
            except OSError:
                pass
        finally:
            conn.close()

    def _dispatch(self, request: dict[str, Any]) -> dict[str, Any]:
        tool = request.get("tool", "")
        args = request.get("args", {})

        if tool == "health":
            return {"result": json.dumps({
                "status": "ok",
                "blender_version": ".".join(str(v) for v in bpy.app.version),
                "file": bpy.data.filepath or "(unsaved)",
            })}

        # Import handlers lazily
        from . import handlers
        handler_fn = getattr(handlers, tool, None)
        if handler_fn is None:
            return {"result": f"Unknown tool: {tool}", "is_error": True}

        try:
            # Execute in Blender's main thread context
            result = _execute_in_main_thread(handler_fn, args)
            return result
        except Exception as e:
            traceback.print_exc()
            return {"result": f"Tool '{tool}' failed: {e}", "is_error": True}


def _execute_in_main_thread(fn, args: dict) -> dict:
    """Execute a function that needs bpy access.

    bpy operations must run from the main thread in Blender.
    We use a timer hack to schedule execution and wait for the result.
    """
    result_container: list[dict] = []
    error_container: list[Exception] = []
    event = threading.Event()

    def _run():
        try:
            result_container.append(fn(args))
        except Exception as e:
            error_container.append(e)
        finally:
            event.set()
        return None  # Don't re-register timer

    bpy.app.timers.register(_run, first_interval=0.0)
    event.wait(timeout=30.0)

    if error_container:
        raise error_container[0]
    if not result_container:
        return {"result": "Timeout: Blender did not execute the command in time.", "is_error": True}
    return result_container[0]
