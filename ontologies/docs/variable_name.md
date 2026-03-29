

# Slot: variable_name 


_Environment variable name (e.g. GSD_SHELL_HOOKS_ENABLED)._





URI: [gsd:variable_name](https://brightforest.dev/schema/gsd_capabilities/variable_name)
Alias: variable_name

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [EnvironmentVariable](EnvironmentVariable.md) | A configuration or secret key read from the environment. |  no  |






## Properties

* Range: [xsd:string](http://www.w3.org/2001/XMLSchema#string)

* Regex pattern: `^[A-Z][A-Z0-9_]*$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:variable_name |
| native | gsd:variable_name |




## LinkML Source

<details>
```yaml
name: variable_name
description: Environment variable name (e.g. GSD_SHELL_HOOKS_ENABLED).
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: variable_name
domain_of:
- EnvironmentVariable
range: string
pattern: ^[A-Z][A-Z0-9_]*$

```
</details>