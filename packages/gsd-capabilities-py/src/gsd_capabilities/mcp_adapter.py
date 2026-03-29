"""Validate and normalize dict payloads for MCP `tools/call` using LinkML Pydantic models."""

from __future__ import annotations

from typing import Any, Mapping, MutableMapping

from pydantic import BaseModel

from gsd_capabilities.generated.models import (
    Capability,
    EnvironmentVariable,
    ExecutionLane,
    Hook,
    MCPServer,
    ResearchArtifact2,
)

_ENTITY_MODELS: dict[str, type[BaseModel]] = {
    "Capability": Capability,
    "EnvironmentVariable": EnvironmentVariable,
    "ExecutionLane": ExecutionLane,
    "Hook": Hook,
    "MCPServer": MCPServer,
    "ResearchArtifact2": ResearchArtifact2,
}

MODEL_NAMES: tuple[str, ...] = tuple(sorted(_ENTITY_MODELS.keys()))


def validate_named_model(model_name: str, payload: Mapping[str, Any]) -> BaseModel:
    """
    Parse *payload* with the ontology class named *model_name*.

    Raises:
        KeyError: unknown model name
        ValidationError: invalid payload for that model
    """
    cls = _ENTITY_MODELS.get(model_name)
    if cls is None:
        raise KeyError(f"Unknown model {model_name!r}; expected one of {MODEL_NAMES}")
    return cls.model_validate(dict(payload))


def coerce_mcp_tool_arguments(
    *,
    validate_as: str | None,
    arguments: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """
    Optionally validate MCP tool arguments against a GSD ontology class, then return a plain dict.

    When *validate_as* is None, returns ``dict(arguments or {})`` unchanged.
    When set, validates a shallow copy (stripping internal keys prefixed with ``__gsd_``).
    """
    raw: dict[str, Any] = dict(arguments or {})
    stripped = {k: v for k, v in raw.items() if not k.startswith("__gsd_")}
    if not validate_as:
        return stripped
    model = validate_named_model(validate_as, stripped)
    return model.model_dump(mode="json", exclude_none=True)


def merge_validated_into_mcp_arguments(
    arguments: MutableMapping[str, Any] | None,
    validated: Mapping[str, Any],
) -> dict[str, Any]:
    """Return a new dict suitable for ``Client.callTool``: validated fields + passthrough extras."""
    base = dict(arguments or {})
    out = {k: v for k, v in base.items() if not k.startswith("__gsd_")}
    out.update(dict(validated))
    return out
