

# Slot: passthrough_only 


_True when GSD must not break existing app/studio consumers._





URI: [gsd:passthrough_only](https://brightforest.dev/schema/gsd_capabilities/passthrough_only)
Alias: passthrough_only

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [EnvironmentVariable](EnvironmentVariable.md) | A configuration or secret key read from the environment. |  no  |






## Properties

* Range: [xsd:boolean](http://www.w3.org/2001/XMLSchema#boolean)




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:passthrough_only |
| native | gsd:passthrough_only |




## LinkML Source

<details>
```yaml
name: passthrough_only
description: True when GSD must not break existing app/studio consumers.
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: passthrough_only
domain_of:
- EnvironmentVariable
range: boolean

```
</details>