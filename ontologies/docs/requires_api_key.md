

# Slot: requires_api_key 


_Env var name required for this lane, if any._





URI: [gsd:requires_api_key](https://brightforest.dev/schema/gsd_capabilities/requires_api_key)
Alias: requires_api_key

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ExecutionLane](ExecutionLane.md) | Where delegated work runs (local, Docker, E2B, etc.). |  no  |






## Properties

* Range: [xsd:string](http://www.w3.org/2001/XMLSchema#string)




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:requires_api_key |
| native | gsd:requires_api_key |




## LinkML Source

<details>
```yaml
name: requires_api_key
description: Env var name required for this lane, if any.
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: requires_api_key
domain_of:
- ExecutionLane
range: string

```
</details>