

# Slot: timeout_seconds 


_Upper bound on hook execution time._





URI: [gsd:timeout_seconds](https://brightforest.dev/schema/gsd_capabilities/timeout_seconds)
Alias: timeout_seconds

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Hook](Hook.md) | A user-defined pipeline step (e.g. post-unit, shell run hook). |  no  |






## Properties

* Range: [xsd:integer](http://www.w3.org/2001/XMLSchema#integer)

* Minimum Value: 1




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:timeout_seconds |
| native | gsd:timeout_seconds |




## LinkML Source

<details>
```yaml
name: timeout_seconds
description: Upper bound on hook execution time.
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: timeout_seconds
domain_of:
- Hook
range: integer
minimum_value: 1

```
</details>