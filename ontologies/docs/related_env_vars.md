

# Slot: related_env_vars 


_Env vars that gate or configure this capability._





URI: [gsd:related_env_vars](https://brightforest.dev/schema/gsd_capabilities/related_env_vars)
Alias: related_env_vars

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Capability](Capability.md) | A discrete product or CLI capability (e.g. Bedrock discovery, research CLI). |  no  |






## Properties

* Range: [EnvironmentVariable](EnvironmentVariable.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:related_env_vars |
| native | gsd:related_env_vars |




## LinkML Source

<details>
```yaml
name: related_env_vars
description: Env vars that gate or configure this capability.
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: related_env_vars
domain_of:
- Capability
range: EnvironmentVariable
multivalued: true
inlined: true
inlined_as_list: true

```
</details>