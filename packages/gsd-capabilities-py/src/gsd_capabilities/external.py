"""JSON serialization helpers for outbound HTTP / webhook calls using ontology instances."""

from __future__ import annotations

import json
from typing import Any, Iterable

from pydantic import BaseModel


def dumps_http_json(obj: BaseModel, *, separators: tuple[str, str] | None = None) -> str:
    """Serialize a Pydantic model to compact JSON for ``Content-Type: application/json`` bodies."""
    data = obj.model_dump(mode="json", exclude_none=True)
    if separators is None:
        separators = (",", ":")
    return json.dumps(data, separators=separators)


def external_service_bundle(models: Iterable[BaseModel]) -> list[dict[str, Any]]:
    """
    Build a JSON-friendly list of object dicts (e.g. batch export to an external analytics API).

    Empty input yields ``[]``.
    """
    return [m.model_dump(mode="json", exclude_none=True) for m in models]
