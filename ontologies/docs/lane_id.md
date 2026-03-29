

# Slot: lane_id 


_Identifier for isolation lane (docker, e2b, overlay)._





URI: [gsd:lane_id](https://brightforest.dev/schema/gsd_capabilities/lane_id)
Alias: lane_id

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
| self | gsd:lane_id |
| native | gsd:lane_id |




## LinkML Source

<details>
```yaml
name: lane_id
description: Identifier for isolation lane (docker, e2b, overlay).
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: lane_id
domain_of:
- ExecutionLane
range: string

```
</details>