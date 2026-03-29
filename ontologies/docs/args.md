

# Slot: args 


_Arguments passed to the MCP server command._





URI: [gsd:args](https://brightforest.dev/schema/gsd_capabilities/args)
Alias: args

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPServer](MCPServer.md) | A Model Context Protocol server configuration or candidate. |  no  |






## Properties

* Range: [xsd:string](http://www.w3.org/2001/XMLSchema#string)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:args |
| native | gsd:args |




## LinkML Source

<details>
```yaml
name: args
description: Arguments passed to the MCP server command.
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: args
domain_of:
- MCPServer
range: string
multivalued: true
inlined: true
inlined_as_list: true

```
</details>