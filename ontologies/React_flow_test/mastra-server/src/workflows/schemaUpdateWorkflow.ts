import { Workflow } from '@mastra/core';
import { SchemaAnalysisStep } from './schemaAnalysisStep';
import { SchemaUpdateStep } from './schemaUpdateStep';
import { SchemaGenerationStep } from './schemaGenerationStep';

export class SchemaUpdateWorkflow extends Workflow {
  name = 'schema_update_workflow';
  description = 'Orchestrates intelligent schema updates by first analyzing requirements via MCP, then applying changes';

  steps = [
    new SchemaAnalysisStep(),
    new SchemaUpdateStep(),
    new SchemaGenerationStep()
  ];
}