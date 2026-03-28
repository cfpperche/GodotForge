"""Extract bpy API documentation from running Blender instance.
Outputs a JSON file with classes, methods, properties, and descriptions."""

import json
import inspect
from typing import Any

import bpy


def extract_bpy_api() -> dict[str, Any]:
    """Extract structured API documentation from bpy.types and bpy.ops."""
    api: dict[str, Any] = {
        "blender_version": ".".join(str(v) for v in bpy.app.version),
        "classes": {},
        "operators": {},
    }

    # Extract bpy.types classes (most important for RAG)
    for name in sorted(dir(bpy.types)):
        if name.startswith("_"):
            continue
        cls = getattr(bpy.types, name, None)
        if cls is None or not isinstance(cls, type):
            continue

        class_info = _extract_class(cls, name)
        if class_info:
            api["classes"][name] = class_info

    # Extract bpy.ops operators (grouped by module)
    for module_name in sorted(dir(bpy.ops)):
        if module_name.startswith("_"):
            continue
        module = getattr(bpy.ops, module_name, None)
        if module is None:
            continue

        for op_name in sorted(dir(module)):
            if op_name.startswith("_"):
                continue
            op = getattr(module, op_name, None)
            if op is None:
                continue

            full_name = f"{module_name}.{op_name}"
            op_info = _extract_operator(op, full_name)
            if op_info:
                api["operators"][full_name] = op_info

    return api


def _extract_class(cls: type, name: str) -> dict[str, Any] | None:
    """Extract class info: description, properties, methods."""
    try:
        doc = inspect.getdoc(cls) or ""
        bases = [b.__name__ for b in cls.__mro__[1:3] if b.__name__ != "object"]

        properties: list[dict[str, str]] = []
        methods: list[dict[str, str]] = []

        for attr_name in sorted(dir(cls)):
            if attr_name.startswith("_"):
                continue
            try:
                attr = getattr(cls, attr_name, None)
                if attr is None:
                    continue

                attr_doc = inspect.getdoc(attr) or ""

                if isinstance(attr, property) or hasattr(attr, "fget"):
                    # It's a property
                    type_hint = ""
                    if attr_doc:
                        # Try to extract type from first line
                        first_line = attr_doc.split("\n")[0]
                        if ":" in first_line:
                            type_hint = first_line.split(":")[0].strip()
                    properties.append({
                        "name": attr_name,
                        "type": type_hint,
                        "description": attr_doc[:200],
                    })
                elif callable(attr):
                    # It's a method
                    sig = ""
                    try:
                        sig = str(inspect.signature(attr))
                    except (ValueError, TypeError):
                        pass
                    methods.append({
                        "name": attr_name,
                        "signature": sig,
                        "description": attr_doc[:200],
                    })
            except Exception:
                continue

        if not properties and not methods and not doc:
            return None

        return {
            "name": name,
            "inherits": bases[0] if bases else "",
            "description": doc[:300],
            "properties": properties[:30],  # Cap to keep size manageable
            "methods": methods[:30],
        }
    except Exception:
        return None


def _extract_operator(op: Any, full_name: str) -> dict[str, str] | None:
    """Extract operator info."""
    try:
        doc = inspect.getdoc(op) or ""
        if not doc:
            return None

        return {
            "name": full_name,
            "description": doc[:300],
        }
    except Exception:
        return None


def extract_and_save(filepath: str) -> str:
    """Extract API and save to JSON file."""
    api = extract_bpy_api()
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(api, f, indent=2, ensure_ascii=False)

    class_count = len(api["classes"])
    op_count = len(api["operators"])
    return f"Extracted {class_count} classes, {op_count} operators → {filepath}"
