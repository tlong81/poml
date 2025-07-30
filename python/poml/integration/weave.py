from __future__ import annotations

from typing import Any
import weave


def log_poml_file(prompt: str, name: str, version: str):
    """Log the given prompt to weave."""
    weave.publish(prompt, name=name + ":" + version)


def log_context_file(context: dict, name: str, version: str):
    """Log the given context to weave."""
    weave.publish(context, name=name + ":" + version)


def log_stylesheet_file(stylesheet: dict, name: str, version: str):
    """Log the given stylesheet to weave."""
    weave.publish(stylesheet, name=name + ":" + version)


def log_poml_call(prompt: str, context: dict | None, stylesheet: dict | None, result: Any) -> Any:
    """Log the entire poml call to weave."""

    @weave.op
    def poml(prompt: str, context: dict | None, stylesheet: dict | None) -> Any:
        return result

    poml(prompt=prompt, context=context, stylesheet=stylesheet)
