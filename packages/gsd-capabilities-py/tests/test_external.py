"""HTTP / webhook JSON helpers."""

from __future__ import annotations

import json

from gsd_capabilities.external import dumps_http_json, external_service_bundle
from gsd_capabilities.generated import EnvironmentVariable, MCPServer


def test_dumps_http_json_default_separators() -> None:
    m = EnvironmentVariable.model_validate({"id": "e:1", "variable_name": "GSD_FOO"})
    s = dumps_http_json(m)
    assert s == json.dumps({"id": "e:1", "variable_name": "GSD_FOO"}, separators=(",", ":"))


def test_dumps_http_json_custom_separators() -> None:
    m = EnvironmentVariable.model_validate({"id": "e:2", "variable_name": "GSD_BAR"})
    s = dumps_http_json(m, separators=(", ", ": "))
    assert ": " in s
    assert ", " in s


def test_external_service_bundle_empty() -> None:
    assert external_service_bundle(()) == []


def test_external_service_bundle_nonempty() -> None:
    a = MCPServer.model_validate({"id": "m:1", "transport": "stdio"})
    b = MCPServer.model_validate({"id": "m:2"})
    out = external_service_bundle([a, b])
    assert out == [
        {"id": "m:1", "transport": "stdio"},
        {"id": "m:2"},
    ]
