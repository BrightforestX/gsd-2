"""CLI entrypoint for validating JSON documents against generated models."""

from __future__ import annotations

import argparse
import json
import sys

from pydantic import ValidationError

from gsd_capabilities.mcp_adapter import MODEL_NAMES, validate_named_model


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="gsd-capabilities")
    parser.add_argument(
        "--model",
        required=True,
        choices=MODEL_NAMES,
        help="Ontology class name (e.g. EnvironmentVariable)",
    )
    args = parser.parse_args(argv)

    try:
        data = json.load(sys.stdin)
        model = validate_named_model(args.model, data)
    except ValidationError as exc:
        sys.stderr.write(exc.json(indent=2) + "\n")
        return 2
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"Invalid JSON: {exc}\n")
        return 3

    json.dump(model.model_dump(mode="json", exclude_none=True), sys.stdout)
    sys.stdout.write("\n")
    return 0
