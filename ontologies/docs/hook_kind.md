

# Slot: hook_kind 


_Classification of hook (prompt-only vs shell run, etc.)._





URI: [gsd:hook_kind](https://brightforest.dev/schema/gsd_capabilities/hook_kind)
Alias: hook_kind

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Hook](Hook.md) | A user-defined pipeline step (e.g. post-unit, shell run hook). |  no  |






## Properties

* Range: [HookKind](HookKind.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:hook_kind |
| native | gsd:hook_kind |




## LinkML Source

<details>
```yaml
name: hook_kind
description: Classification of hook (prompt-only vs shell run, etc.).
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: hook_kind
domain_of:
- Hook
range: HookKind

```
</details>