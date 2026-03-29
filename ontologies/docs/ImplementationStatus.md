# Enum: ImplementationStatus 



URI: [gsd:ImplementationStatus](https://brightforest.dev/schema/gsd_capabilities/ImplementationStatus)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| planned | None |  |
| in_progress | None |  |
| completed | None |  |
| deprecated | None |  |




## Slots

| Name | Description |
| ---  | --- |
| [status](status.md) | Lifecycle state of the capability. |





## Identifier and Mapping Information






### Schema Source


* from schema: https://brightforest.dev/schema/gsd_capabilities






## LinkML Source

<details>
```yaml
name: ImplementationStatus
from_schema: https://brightforest.dev/schema/gsd_capabilities
rank: 1000
permissible_values:
  planned:
    text: planned
  in_progress:
    text: in_progress
  completed:
    text: completed
  deprecated:
    text: deprecated

```
</details>