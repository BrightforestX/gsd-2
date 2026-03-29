from __future__ import annotations 

import re
import sys
from datetime import (
    date,
    datetime,
    time
)
from decimal import Decimal 
from enum import Enum 
from typing import (
    Any,
    ClassVar,
    Literal,
    Optional,
    Union
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    field_validator
)


metamodel_version = "None"
version = "1.1.0"


class ConfiguredBaseModel(BaseModel):
    model_config = ConfigDict(
        validate_assignment = True,
        validate_default = True,
        extra = "forbid",
        arbitrary_types_allowed = True,
        use_enum_values = True,
        strict = False,
    )
    pass




class LinkMLMeta(RootModel):
    root: dict[str, Any] = {}
    model_config = ConfigDict(frozen=True)

    def __getattr__(self, key:str):
        return getattr(self.root, key)

    def __getitem__(self, key:str):
        return self.root[key]

    def __setitem__(self, key:str, value):
        self.root[key] = value

    def __contains__(self, key:str) -> bool:
        return key in self.root


linkml_meta = LinkMLMeta({'annotations': {'alignment_note': {'tag': 'alignment_note',
                                        'value': 'Models capability phases P0–P5 '
                                                 'and tool contracts in-repo.'},
                     'maintainer_domain': {'tag': 'maintainer_domain',
                                           'value': 'brightforest.dev'}},
     'default_prefix': 'gsd',
     'default_range': 'string',
     'description': 'Classes and slots for describing GSD (Get Stuff Done) feature '
                    'capabilities, environment variables, pipeline hooks, MCP '
                    'integration, and research artifacts. Aligns with the phased '
                    'capability expansion model (P0–P5).\n',
     'emit_prefixes': ['gsd', 'linkml'],
     'id': 'https://brightforest.dev/schema/gsd_capabilities',
     'id_prefixes': ['gsd', 'LINKML'],
     'imports': ['linkml:types'],
     'license': 'https://creativecommons.org/licenses/by/4.0/',
     'name': 'gsd_capabilities',
     'prefixes': {'dcterms': {'prefix_prefix': 'dcterms',
                              'prefix_reference': 'http://purl.org/dc/terms/'},
                  'gsd': {'prefix_prefix': 'gsd',
                          'prefix_reference': 'https://brightforest.dev/schema/gsd_capabilities/'},
                  'linkml': {'prefix_prefix': 'linkml',
                             'prefix_reference': 'https://w3id.org/linkml/'},
                  'rdfs': {'prefix_prefix': 'rdfs',
                           'prefix_reference': 'http://www.w3.org/2000/01/rdf-schema#'},
                  'xsd': {'prefix_prefix': 'xsd',
                          'prefix_reference': 'http://www.w3.org/2001/XMLSchema#'}},
     'see_also': ['https://linkml.io/linkml/schemas/index.html',
                  'https://brightforest.dev/'],
     'source_file': '/Users/clifforddalsoniii/Documents/Brightforest/projects/tools/gsd-2/ontologies/gsd-capabilities.linkml.yaml',
     'subsets': {'gsd_core_surface': {'description': 'Entities shown in doctor '
                                                     'output and React Flow '
                                                     'ontology canvas.',
                                      'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
                                      'name': 'gsd_core_surface'},
                 'gsd_experimental': {'description': 'Optional or in-flux '
                                                     'modeling; may change across '
                                                     'releases.',
                                      'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
                                      'name': 'gsd_experimental'}},
     'title': 'GSD capabilities ontology',
     'todos': ['Rename ResearchArtifact2 when downstream consumers migrate.'],
     'types': {'PhaseToken': {'description': 'Phase bucket token such as '
                                             'P0_BEDROCK.',
                              'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
                              'name': 'PhaseToken',
                              'pattern': '^P[0-5]_[A-Z0-9_]+$',
                              'typeof': 'string',
                              'uri': 'xsd:string'}}} )

class CapabilityPhase(str, Enum):
    """
    Phased rollout identifiers used in planning.
    """
    P0_BEDROCK = "P0_BEDROCK"
    """
    Bedrock auth / list-models discovery.
    """
    P1_RESEARCH = "P1_RESEARCH"
    """
    Research CLI and MCP merge into research docs.
    """
    P2_SHELL_HOOKS = "P2_SHELL_HOOKS"
    """
    Opt-in shell hooks in the change pipeline.
    """
    P3_MCP_BOOTSTRAP = "P3_MCP_BOOTSTRAP"
    """
    MCP server discovery and config materialization.
    """
    P4_LEARNING = "P4_LEARNING"
    """
    Learning overlays, synthesis, optional payload logging.
    """
    P5_SANDBOX = "P5_SANDBOX"
    """
    Sandbox UX, Docker smoke, optional E2B lane.
    """


class ImplementationStatus(str, Enum):
    """
    Delivery lifecycle label for a capability or work item.
    """
    planned = "planned"
    """
    Captured in roadmap only.
    """
    in_progress = "in_progress"
    """
    Active implementation.
    """
    completed = "completed"
    """
    Shipped in CLI and tests green.
    """
    deprecated = "deprecated"
    """
    Retired; kept for historical docs only.
    """


class HookKind(str, Enum):
    """
    Where in the pipeline a hook participates and whether it executes shell.
    """
    post_unit_prompt = "post_unit_prompt"
    pre_dispatch_prompt = "pre_dispatch_prompt"
    post_unit_shell = "post_unit_shell"
    ci_shell = "ci_shell"


class ResearchArtifactKind(str, Enum):
    """
    Distinguishes milestone research packs from slice-level write-ups.
    """
    milestone_research = "milestone_research"
    slice_research = "slice_research"



class NamedEntity(ConfiguredBaseModel):
    """
    Anything with a stable identifier and human label.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'abstract': True,
         'class_uri': 'gsd:NamedEntity',
         'from_schema': 'https://brightforest.dev/schema/gsd_capabilities'})

    id: str = Field(default=..., description="""Stable URI or CURIE-style id for the instance.""", json_schema_extra = { "linkml_meta": {'alias': 'id',
         'domain_of': ['NamedEntity'],
         'exact_mappings': ['dcterms:identifier']} })
    name: Optional[str] = Field(default=None, description="""Short human-readable name.""", json_schema_extra = { "linkml_meta": {'alias': 'name', 'domain_of': ['NamedEntity']} })
    description: Optional[str] = Field(default=None, description="""Longer prose description.""", json_schema_extra = { "linkml_meta": {'alias': 'description', 'domain_of': ['NamedEntity']} })


class HasDocumentation(ConfiguredBaseModel):
    """
    Records carrying a canonical documentation link.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
         'mixin': True})

    documentation_uri: Optional[str] = Field(default=None, description="""Link to maintainer or user documentation.""", json_schema_extra = { "linkml_meta": {'alias': 'documentation_uri',
         'annotations': {'tooling_rank': {'tag': 'tooling_rank',
                                          'value': 'Prefer evergreen documentation '
                                                   'URIs over ephemeral notes.'}},
         'domain_of': ['HasDocumentation'],
         'exact_mappings': ['rdfs:seeAlso']} })


class Capability(HasDocumentation, NamedEntity):
    """
    A discrete product or CLI capability (e.g. Bedrock discovery, research CLI).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'aliases': ['product capability'],
         'class_uri': 'gsd:Capability',
         'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
         'in_subset': ['gsd_core_surface'],
         'mixins': ['HasDocumentation'],
         'slot_usage': {'phase': {'name': 'phase', 'recommended': True},
                        'status': {'name': 'status', 'required': False}}})

    phase: Optional[CapabilityPhase] = Field(default=None, description="""Planning / delivery phase bucket (P0–P5).""", json_schema_extra = { "linkml_meta": {'alias': 'phase',
         'domain_of': ['Capability', 'EnvironmentVariable'],
         'recommended': True} })
    status: Optional[ImplementationStatus] = Field(default=None, description="""Lifecycle state of the capability.""", json_schema_extra = { "linkml_meta": {'alias': 'status', 'domain_of': ['Capability']} })
    related_env_vars: Optional[list[EnvironmentVariable]] = Field(default=None, description="""Env vars that gate or configure this capability.""", json_schema_extra = { "linkml_meta": {'alias': 'related_env_vars',
         'domain_of': ['Capability'],
         'inverse': 'gates_capabilities'} })
    documentation_uri: Optional[str] = Field(default=None, description="""Link to maintainer or user documentation.""", json_schema_extra = { "linkml_meta": {'alias': 'documentation_uri',
         'annotations': {'tooling_rank': {'tag': 'tooling_rank',
                                          'value': 'Prefer evergreen documentation '
                                                   'URIs over ephemeral notes.'}},
         'domain_of': ['HasDocumentation'],
         'exact_mappings': ['rdfs:seeAlso']} })
    id: str = Field(default=..., description="""Stable URI or CURIE-style id for the instance.""", json_schema_extra = { "linkml_meta": {'alias': 'id',
         'domain_of': ['NamedEntity'],
         'exact_mappings': ['dcterms:identifier']} })
    name: Optional[str] = Field(default=None, description="""Short human-readable name.""", json_schema_extra = { "linkml_meta": {'alias': 'name', 'domain_of': ['NamedEntity']} })
    description: Optional[str] = Field(default=None, description="""Longer prose description.""", json_schema_extra = { "linkml_meta": {'alias': 'description', 'domain_of': ['NamedEntity']} })


class EnvironmentVariable(NamedEntity):
    """
    A configuration or secret key read from the environment.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'class_uri': 'gsd:EnvironmentVariable',
         'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
         'in_subset': ['gsd_core_surface']})

    variable_name: Optional[str] = Field(default=None, description="""Environment variable name (e.g. GSD_SHELL_HOOKS_ENABLED).""", json_schema_extra = { "linkml_meta": {'alias': 'variable_name',
         'domain_of': ['EnvironmentVariable'],
         'structured_pattern': {'partial_match': False, 'syntax': '^[A-Z][A-Z0-9_]*$'}} })
    phase: Optional[CapabilityPhase] = Field(default=None, description="""Planning / delivery phase bucket (P0–P5).""", json_schema_extra = { "linkml_meta": {'alias': 'phase', 'domain_of': ['Capability', 'EnvironmentVariable']} })
    required_behavior: Optional[str] = Field(default=None, description="""Expected semantics when set, unset, or invalid.""", json_schema_extra = { "linkml_meta": {'alias': 'required_behavior', 'domain_of': ['EnvironmentVariable']} })
    is_gsd_prefixed: Optional[bool] = Field(default=None, description="""True when the name starts with GSD_.""", json_schema_extra = { "linkml_meta": {'alias': 'is_gsd_prefixed', 'domain_of': ['EnvironmentVariable']} })
    passthrough_only: Optional[bool] = Field(default=None, description="""True when GSD must not break existing app/studio consumers.""", json_schema_extra = { "linkml_meta": {'alias': 'passthrough_only', 'domain_of': ['EnvironmentVariable']} })
    gates_capabilities: Optional[list[Capability]] = Field(default=None, description="""Capabilities that depend on this environment variable.""", json_schema_extra = { "linkml_meta": {'alias': 'gates_capabilities',
         'domain': 'EnvironmentVariable',
         'domain_of': ['EnvironmentVariable'],
         'inverse': 'related_env_vars'} })
    id: str = Field(default=..., description="""Stable URI or CURIE-style id for the instance.""", json_schema_extra = { "linkml_meta": {'alias': 'id',
         'domain_of': ['NamedEntity'],
         'exact_mappings': ['dcterms:identifier']} })
    name: Optional[str] = Field(default=None, description="""Short human-readable name.""", json_schema_extra = { "linkml_meta": {'alias': 'name', 'domain_of': ['NamedEntity']} })
    description: Optional[str] = Field(default=None, description="""Longer prose description.""", json_schema_extra = { "linkml_meta": {'alias': 'description', 'domain_of': ['NamedEntity']} })

    @field_validator('variable_name')
    def pattern_variable_name(cls, v):
        pattern=re.compile(r"^[A-Z][A-Z0-9_]*$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid variable_name format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid variable_name format: {v}"
            raise ValueError(err_msg)
        return v


class Hook(NamedEntity):
    """
    A user-defined pipeline step (e.g. post-unit, shell run hook).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'class_uri': 'gsd:Hook',
         'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
         'in_subset': ['gsd_core_surface']})

    hook_kind: Optional[HookKind] = Field(default=None, description="""Classification of hook (prompt-only vs shell run, etc.).""", json_schema_extra = { "linkml_meta": {'alias': 'hook_kind', 'domain_of': ['Hook']} })
    shell_command: Optional[str] = Field(default=None, description="""Executable line for run-type hooks.""", json_schema_extra = { "linkml_meta": {'alias': 'shell_command', 'domain_of': ['Hook']} })
    timeout_seconds: Optional[int] = Field(default=None, description="""Upper bound on hook execution time.""", ge=1, json_schema_extra = { "linkml_meta": {'alias': 'timeout_seconds', 'domain_of': ['Hook']} })
    opt_in_flag: Optional[str] = Field(default=None, description="""Env var or pref that must be truthy before dangerous hooks run.""", json_schema_extra = { "linkml_meta": {'alias': 'opt_in_flag',
         'deprecated': 'Prefer explicit hook_kind and shell_command guards; kept for '
                       'backward compatibility notes.',
         'domain_of': ['Hook']} })
    id: str = Field(default=..., description="""Stable URI or CURIE-style id for the instance.""", json_schema_extra = { "linkml_meta": {'alias': 'id',
         'domain_of': ['NamedEntity'],
         'exact_mappings': ['dcterms:identifier']} })
    name: Optional[str] = Field(default=None, description="""Short human-readable name.""", json_schema_extra = { "linkml_meta": {'alias': 'name', 'domain_of': ['NamedEntity']} })
    description: Optional[str] = Field(default=None, description="""Longer prose description.""", json_schema_extra = { "linkml_meta": {'alias': 'description', 'domain_of': ['NamedEntity']} })


class MCPServer(HasDocumentation, NamedEntity):
    """
    A Model Context Protocol server configuration or candidate.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'class_uri': 'gsd:MCPServer',
         'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
         'in_subset': ['gsd_core_surface'],
         'mixins': ['HasDocumentation'],
         'slot_usage': {'transport': {'name': 'transport', 'recommended': True}}})

    transport: Optional[str] = Field(default=None, description="""MCP transport (e.g. stdio, sse).""", json_schema_extra = { "linkml_meta": {'alias': 'transport', 'domain_of': ['MCPServer'], 'recommended': True} })
    command: Optional[str] = Field(default=None, description="""Server launch command.""", json_schema_extra = { "linkml_meta": {'alias': 'command', 'domain_of': ['MCPServer']} })
    args: Optional[list[str]] = Field(default=None, description="""Arguments passed to the MCP server command.""", json_schema_extra = { "linkml_meta": {'alias': 'args', 'domain_of': ['MCPServer']} })
    tools_root_path: Optional[str] = Field(default=None, description="""Filesystem root for bootstrap materialization (e.g. GSD_MCP_TOOLS_ROOT).""", json_schema_extra = { "linkml_meta": {'alias': 'tools_root_path', 'domain_of': ['MCPServer']} })
    documentation_uri: Optional[str] = Field(default=None, description="""Link to maintainer or user documentation.""", json_schema_extra = { "linkml_meta": {'alias': 'documentation_uri',
         'annotations': {'tooling_rank': {'tag': 'tooling_rank',
                                          'value': 'Prefer evergreen documentation '
                                                   'URIs over ephemeral notes.'}},
         'domain_of': ['HasDocumentation'],
         'exact_mappings': ['rdfs:seeAlso']} })
    id: str = Field(default=..., description="""Stable URI or CURIE-style id for the instance.""", json_schema_extra = { "linkml_meta": {'alias': 'id',
         'domain_of': ['NamedEntity'],
         'exact_mappings': ['dcterms:identifier']} })
    name: Optional[str] = Field(default=None, description="""Short human-readable name.""", json_schema_extra = { "linkml_meta": {'alias': 'name', 'domain_of': ['NamedEntity']} })
    description: Optional[str] = Field(default=None, description="""Longer prose description.""", json_schema_extra = { "linkml_meta": {'alias': 'description', 'domain_of': ['NamedEntity']} })


class ResearchArtifact2(NamedEntity):
    """
    Output from research dispatch (milestone or slice research doc).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'class_uri': 'gsd:ResearchArtifact2',
         'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
         'in_subset': ['gsd_experimental'],
         'see_also': ['https://linkml.io/linkml/schemas/index.html']})

    artifact_kind: Optional[ResearchArtifactKind] = Field(default=None, description="""Milestone vs slice research output.""", json_schema_extra = { "linkml_meta": {'alias': 'artifact_kind', 'domain_of': ['ResearchArtifact2']} })
    path_pattern: Optional[str] = Field(default=None, description="""Filename or glob pattern (e.g. M*-RESEARCH.md).""", json_schema_extra = { "linkml_meta": {'alias': 'path_pattern', 'domain_of': ['ResearchArtifact2']} })
    merged_mcp_server: Optional[str] = Field(default=None, description="""Optional MCP server whose output is merged into the artifact.""", json_schema_extra = { "linkml_meta": {'alias': 'merged_mcp_server', 'domain_of': ['ResearchArtifact2']} })
    id: str = Field(default=..., description="""Stable URI or CURIE-style id for the instance.""", json_schema_extra = { "linkml_meta": {'alias': 'id',
         'domain_of': ['NamedEntity'],
         'exact_mappings': ['dcterms:identifier']} })
    name: Optional[str] = Field(default=None, description="""Short human-readable name.""", json_schema_extra = { "linkml_meta": {'alias': 'name', 'domain_of': ['NamedEntity']} })
    description: Optional[str] = Field(default=None, description="""Longer prose description.""", json_schema_extra = { "linkml_meta": {'alias': 'description', 'domain_of': ['NamedEntity']} })


class ExecutionLane(NamedEntity):
    """
    Where delegated work runs (local, Docker, E2B, etc.).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'class_uri': 'gsd:ExecutionLane',
         'from_schema': 'https://brightforest.dev/schema/gsd_capabilities',
         'in_subset': ['gsd_experimental']})

    lane_id: Optional[str] = Field(default=None, description="""Identifier for isolation lane (docker, e2b, overlay).""", json_schema_extra = { "linkml_meta": {'alias': 'lane_id', 'domain_of': ['ExecutionLane']} })
    requires_api_key: Optional[str] = Field(default=None, description="""Env var name required for this lane, if any.""", json_schema_extra = { "linkml_meta": {'alias': 'requires_api_key', 'domain_of': ['ExecutionLane']} })
    id: str = Field(default=..., description="""Stable URI or CURIE-style id for the instance.""", json_schema_extra = { "linkml_meta": {'alias': 'id',
         'domain_of': ['NamedEntity'],
         'exact_mappings': ['dcterms:identifier']} })
    name: Optional[str] = Field(default=None, description="""Short human-readable name.""", json_schema_extra = { "linkml_meta": {'alias': 'name', 'domain_of': ['NamedEntity']} })
    description: Optional[str] = Field(default=None, description="""Longer prose description.""", json_schema_extra = { "linkml_meta": {'alias': 'description', 'domain_of': ['NamedEntity']} })


# Model rebuild
# see https://pydantic-docs.helpmanual.io/usage/models/#rebuilding-a-model
NamedEntity.model_rebuild()
HasDocumentation.model_rebuild()
Capability.model_rebuild()
EnvironmentVariable.model_rebuild()
Hook.model_rebuild()
MCPServer.model_rebuild()
ResearchArtifact2.model_rebuild()
ExecutionLane.model_rebuild()

