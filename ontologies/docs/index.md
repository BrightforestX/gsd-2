# GSD capabilities ontology

Classes and slots for describing GSD (Get Stuff Done) feature capabilities, environment variables, pipeline hooks, MCP integration, and research artifacts. Aligns with the phased capability expansion model (P0–P5).


URI: https://brightforest.dev/schema/gsd_capabilities

Name: gsd_capabilities



## Classes

| Class | Description |
| --- | --- |
| [NamedEntity](NamedEntity.md) | Anything with a stable identifier and human label. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Capability](Capability.md) | A discrete product or CLI capability (e.g. Bedrock discovery, research CLI). |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[EnvironmentVariable](EnvironmentVariable.md) | A configuration or secret key read from the environment. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ExecutionLane](ExecutionLane.md) | Where delegated work runs (local, Docker, E2B, etc.). |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Hook](Hook.md) | A user-defined pipeline step (e.g. post-unit, shell run hook). |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[MCPServer](MCPServer.md) | A Model Context Protocol server configuration or candidate. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ResearchArtifact](ResearchArtifact.md) | Output from research dispatch (milestone or slice research doc). |



## Slots

| Slot | Description |
| --- | --- |
| [args](args.md) | Arguments passed to the MCP server command. |
| [artifact_kind](artifact_kind.md) | Milestone vs slice research output. |
| [command](command.md) | Server launch command. |
| [description](description.md) | Longer prose description. |
| [documentation_uri](documentation_uri.md) | Link to maintainer or user documentation. |
| [hook_kind](hook_kind.md) | Classification of hook (prompt-only vs shell run, etc.). |
| [id](id.md) | Stable URI or CURIE-style id for the instance. |
| [is_gsd_prefixed](is_gsd_prefixed.md) | True when the name starts with GSD_. |
| [lane_id](lane_id.md) | Identifier for isolation lane (docker, e2b, overlay). |
| [merged_mcp_server](merged_mcp_server.md) | Optional MCP server whose output is merged into the artifact. |
| [name](name.md) | Short human-readable name. |
| [opt_in_flag](opt_in_flag.md) | Env var or pref that must be truthy before dangerous hooks run. |
| [passthrough_only](passthrough_only.md) | True when GSD must not break existing app/studio consumers. |
| [path_pattern](path_pattern.md) | Filename or glob pattern (e.g. M*-RESEARCH.md). |
| [phase](phase.md) | Planning / delivery phase bucket (P0–P5). |
| [related_env_vars](related_env_vars.md) | Env vars that gate or configure this capability. |
| [required_behavior](required_behavior.md) | Expected semantics when set, unset, or invalid. |
| [requires_api_key](requires_api_key.md) | Env var name required for this lane, if any. |
| [shell_command](shell_command.md) | Executable line for run-type hooks. |
| [status](status.md) | Lifecycle state of the capability. |
| [timeout_seconds](timeout_seconds.md) | Upper bound on hook execution time. |
| [tools_root_path](tools_root_path.md) | Filesystem root for bootstrap materialization (e.g. GSD_MCP_TOOLS_ROOT). |
| [transport](transport.md) | MCP transport (e.g. stdio, sse). |
| [variable_name](variable_name.md) | Environment variable name (e.g. GSD_SHELL_HOOKS_ENABLED). |


## Enumerations

| Enumeration | Description |
| --- | --- |
| [CapabilityPhase](CapabilityPhase.md) | Phased rollout identifiers used in planning. |
| [HookKind](HookKind.md) |  |
| [ImplementationStatus](ImplementationStatus.md) |  |
| [ResearchArtifactKind](ResearchArtifactKind.md) |  |


## Types

| Type | Description |
| --- | --- |


## Subsets

| Subset | Description |
| --- | --- |
