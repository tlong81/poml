from __future__ import annotations

from typing import Any
from langsmith import traceable


def log_poml_call(
    name: str, prompt: str, context: dict | None, stylesheet: dict | None, result: Any
) -> Any:
    """Log the entire poml call to LangSmith."""

    @traceable(name=name)
    def poml(prompt, context, stylesheet):
        return result

    poml(prompt, context, stylesheet)
