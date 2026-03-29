# gsd-capabilities (Python)

[Pydantic](https://docs.pydantic.dev/) v2 models generated from `ontologies/gsd-capabilities.linkml.yaml` via the [LinkML CLI](https://linkml.io/linkml/), plus helpers for validating payloads before MCP tool calls and building JSON bodies for external HTTP APIs.

## Regenerate models

From the repository root:

```bash
npm run capabilities:gen
```

Or manually:

```bash
./packages/gsd-capabilities-py/scripts/generate-models.sh
```

Requires `linkml` on your PATH (`pip install linkml`).

## Install & test (100% coverage on non-generated code)

```bash
cd packages/gsd-capabilities-py
python3 -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
pytest --cov=gsd_capabilities --cov-report=term-missing
```

Generated files under `src/gsd_capabilities/generated/` are excluded from the coverage gate.

## CLI

```bash
echo '{"id":"x","variable_name":"GSD_FOO"}' | gsd-capabilities validate --model EnvironmentVariable
```

## TypeScript / GSD `mcp_call`

Pass `validateAs` with a class name (`Capability`, `EnvironmentVariable`, …) so GSD validates `args` with this package before calling the MCP server (requires `python3` and this package installed, or `GSD_CAPABILITIES_PY_ROOT` pointing at this directory).
