# Enum: HookKind 



URI: [gsd:HookKind](https://brightforest.dev/schema/gsd_capabilities/HookKind)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| post_unit_prompt | None |  |
| pre_dispatch_prompt | None |  |
| post_unit_shell | None |  |
| ci_shell | None |  |




## Slots

| Name | Description |
| ---  | --- |
| [hook_kind](hook_kind.md) | Classification of hook (prompt-only vs shell run, etc.). |





## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities






## LinkML Source

<details>
```yaml
name: HookKind
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
permissible_values:
  post_unit_prompt:
    text: post_unit_prompt
  pre_dispatch_prompt:
    text: pre_dispatch_prompt
  post_unit_shell:
    text: post_unit_shell
  ci_shell:
    text: ci_shell

```
</details>