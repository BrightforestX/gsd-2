"""MCP argument coercion and merge helpers."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from gsd_capabilities.mcp_adapter import (
    MODEL_NAMES,
    coerce_mcp_tool_arguments,
    merge_validated_into_mcp_arguments,
    validate_named_model,
)
from gsd_capabilities.generated import CapabilityPhase, ImplementationStatus


def test_model_names_sorted_and_complete() -> None:
    assert MODEL_NAMES == tuple(sorted(MODEL_NAMES))
    assert set(MODEL_NAMES) == {
        "Capability",
        "EnvironmentVariable",
        "ExecutionLane",
        "Hook",
        "MCPServer",
        "ResearchArtifact2",
    }


def test_validate_named_model_unknown_raises() -> None:
    with pytest.raises(KeyError, match="Unknown model"):
        validate_named_model("NotAModel", {"id": "x"})


@pytest.mark.parametrize(
    ("model_name", "payload"),
    [
        (
            "Capability",
            {
                "id": "cap:1",
                "phase": "P0_BEDROCK",
                "status": "planned",
            },
        ),
        ("EnvironmentVariable", {"id": "env:1", "variable_name": "GSD_OK"}),
        ("ExecutionLane", {"id": "lane:1", "lane_id": "docker"}),
        ("Hook", {"id": "hook:1", "hook_kind": "post_unit_shell"}),
        ("MCPServer", {"id": "mcp:1", "transport": "stdio", "command": "npx"}),
        (
            "ResearchArtifact2",
            {"id": "ra:1", "artifact_kind": "milestone_research"},
        ),
    ],
)
def test_validate_named_model_each_entity(model_name: str, payload: dict) -> None:
    m = validate_named_model(model_name, payload)
    dumped = m.model_dump(mode="json", exclude_none=True)
    assert dumped["id"] == payload["id"]


def test_validate_named_model_validation_error() -> None:
    with pytest.raises(ValidationError):
        validate_named_model("EnvironmentVariable", {"id": "x", "variable_name": "lowercase_bad"})


def test_coerce_without_validate_as_strips_gsd_keys() -> None:
    out = coerce_mcp_tool_arguments(
        validate_as=None,
        arguments={"a": 1, "__gsd_meta": {"x": True}},
    )
    assert out == {"a": 1}


def test_coerce_without_validate_as_none_arguments() -> None:
    assert coerce_mcp_tool_arguments(validate_as=None, arguments=None) == {}


def test_coerce_with_validate_as_normalizes() -> None:
    out = coerce_mcp_tool_arguments(
        validate_as="EnvironmentVariable",
        arguments={"id": "e:coerce", "variable_name": "GSD_X", "__gsd_trace": 1},
    )
    assert out == {"id": "e:coerce", "variable_name": "GSD_X"}


def test_coerce_validate_as_unknown_model() -> None:
    with pytest.raises(KeyError, match="Unknown model"):
        coerce_mcp_tool_arguments(validate_as="Nope", arguments={"id": "x"})


def test_coerce_validate_as_invalid_payload() -> None:
    with pytest.raises(ValidationError):
        coerce_mcp_tool_arguments(
            validate_as="EnvironmentVariable",
            arguments={"id": "x", "extra_slot": 1},
        )


def test_merge_validated_none_arguments() -> None:
    assert merge_validated_into_mcp_arguments(None, {"id": "m:1"}) == {"id": "m:1"}


def test_merge_strips_gsd_and_overwrites() -> None:
    out = merge_validated_into_mcp_arguments(
        {"__gsd_x": 1, "keep": 2, "overwrite": 0},
        {"overwrite": 9, "new": 3},
    )
    assert out == {"keep": 2, "overwrite": 9, "new": 3}


def test_capability_enum_round_trip_via_coerce() -> None:
    out = coerce_mcp_tool_arguments(
        validate_as="Capability",
        arguments={
            "id": "c:enum",
            "phase": CapabilityPhase.P1_RESEARCH.value,
            "status": ImplementationStatus.in_progress.value,
        },
    )
    assert out["phase"] == "P1_RESEARCH"
    assert out["status"] == "in_progress"
