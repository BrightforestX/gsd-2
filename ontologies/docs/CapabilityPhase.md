# Enum: CapabilityPhase 




_Phased rollout identifiers used in planning._



URI: [gsd:CapabilityPhase](https://brightforest.dev/schema/gsd_capabilities/CapabilityPhase)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| P0_BEDROCK | None | Bedrock auth / list-models discovery. |
| P1_RESEARCH | None | Research CLI and MCP merge into research docs. |
| P2_SHELL_HOOKS | None | Opt-in shell hooks in the change pipeline. |
| P3_MCP_BOOTSTRAP | None | MCP server discovery and config materialization. |
| P4_LEARNING | None | Learning overlays, synthesis, optional payload logging. |
| P5_SANDBOX | None | Sandbox UX, Docker smoke, optional E2B lane. |




## Slots

| Name | Description |
| ---  | --- |
| [phase](phase.md) | Planning / delivery phase bucket (P0–P5). |





## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities






## LinkML Source

<details>
```yaml
name: CapabilityPhase
description: Phased rollout identifiers used in planning.
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
permissible_values:
  P0_BEDROCK:
    text: P0_BEDROCK
    description: Bedrock auth / list-models discovery.
  P1_RESEARCH:
    text: P1_RESEARCH
    description: Research CLI and MCP merge into research docs.
  P2_SHELL_HOOKS:
    text: P2_SHELL_HOOKS
    description: Opt-in shell hooks in the change pipeline.
  P3_MCP_BOOTSTRAP:
    text: P3_MCP_BOOTSTRAP
    description: MCP server discovery and config materialization.
  P4_LEARNING:
    text: P4_LEARNING
    description: Learning overlays, synthesis, optional payload logging.
  P5_SANDBOX:
    text: P5_SANDBOX
    description: Sandbox UX, Docker smoke, optional E2B lane.

```
</details>