

# Slot: name 


_Short human-readable name._





URI: [gsd:name](https://brightforest.dev/schema/gsd_capabilities/name)
Alias: name

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [NamedEntity](NamedEntity.md) | Anything with a stable identifier and human label. |  no  |
| [ResearchArtifact](ResearchArtifact.md) | Output from research dispatch (milestone or slice research doc). |  no  |
| [ExecutionLane](ExecutionLane.md) | Where delegated work runs (local, Docker, E2B, etc.). |  no  |
| [Capability](Capability.md) | A discrete product or CLI capability (e.g. Bedrock discovery, research CLI). |  no  |
| [MCPServer](MCPServer.md) | A Model Context Protocol server configuration or candidate. |  no  |
| [Hook](Hook.md) | A user-defined pipeline step (e.g. post-unit, shell run hook). |  no  |
| [EnvironmentVariable](EnvironmentVariable.md) | A configuration or secret key read from the environment. |  no  |






## Properties

* Range: [xsd:string](http://www.w3.org/2001/XMLSchema#string)




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:name |
| native | gsd:name |




## LinkML Source

<details>
```yaml
name: name
description: Short human-readable name.
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: name
domain_of:
- NamedEntity
range: string

```
</details>