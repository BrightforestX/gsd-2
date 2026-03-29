"""CLI validation entrypoint."""

from __future__ import annotations

import io
import json
import sys

import pytest

from gsd_capabilities import cli


def test_cli_success(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setattr(
        sys,
        "stdin",
        io.StringIO(json.dumps({"id": "cli:ok", "variable_name": "GSD_CLI_OK"})),
    )
    assert cli.main(["--model", "EnvironmentVariable"]) == 0
    out = json.loads(capsys.readouterr().out)
    assert out["id"] == "cli:ok"
    assert out["variable_name"] == "GSD_CLI_OK"


def test_cli_validation_error(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setattr(
        sys,
        "stdin",
        io.StringIO(json.dumps({"id": "cli:bad", "variable_name": "bad_name"})),
    )
    assert cli.main(["--model", "EnvironmentVariable"]) == 2
    err = capsys.readouterr().err
    assert "variable_name" in err or "bad_name" in err


def test_cli_invalid_json(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setattr(sys, "stdin", io.StringIO("not json {"))
    assert cli.main(["--model", "EnvironmentVariable"]) == 3
    assert "Invalid JSON" in capsys.readouterr().err
