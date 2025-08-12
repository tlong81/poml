from __future__ import annotations

from typing import Any
from langfuse.decorators import observe


def log_poml_call(
    name: str, prompt: str, context: dict | None, stylesheet: dict | None, result: Any
) -> Any:
    """Log the entire poml call to Langfuse."""

    @observe(name=name)
    def poml(prompt, context, stylesheet):
        return result

    poml(prompt=prompt, context=context, stylesheet=stylesheet)
