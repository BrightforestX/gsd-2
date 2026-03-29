

# Slot: transport 


_MCP transport (e.g. stdio, sse)._





URI: [gsd:transport](https://brightforest.dev/schema/gsd_capabilities/transport)
Alias: transport

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPServer](MCPServer.md) | A Model Context Protocol server configuration or candidate. |  no  |






## Properties

* Range: [xsd:string](http://www.w3.org/2001/XMLSchema#string)




## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | gsd:transport |
| native | gsd:transport |




## LinkML Source

<details>
```yaml
name: transport
description: MCP transport (e.g. stdio, sse).
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
alias: transport
domain_of:
- MCPServer
range: string

```
</details>