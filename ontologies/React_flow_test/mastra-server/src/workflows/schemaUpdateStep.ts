import { Step } from '@mastra/core';
import { promises as fs } from 'fs';
import { load, dump } from 'js-yaml';
import { z } from 'zod';

const SchemaUpdateInputSchema = z.object({
  schemaFilePath: z.string().describe('Path to the LinkML schema file to update'),
  updates: z.array(z.object({
    path: z.string().describe('JSONPath-like update path in the schema object'),
    value: z.any().describe('New value to set at the path')
  })).describe('Array of schema updates to apply')
});

const SchemaUpdateOutputSchema = z.object({
  success: z.boolean(),
  updatedSchema: z.any(),
  message: z.string()
});

export class SchemaUpdateStep extends Step<typeof SchemaUpdateInputSchema, typeof SchemaUpdateOutputSchema> {
  name = 'schema_update_step';
  description = 'Updates LinkML schema files programmatically by applying specified changes';

  inputSchema = SchemaUpdateInputSchema;
  outputSchema = SchemaUpdateOutputSchema;

  async execute({ context }) {
    const { schemaFilePath, updates } = context.input;

    try {
      // Read existing schema file
      const schemaContent = await fs.readFile(schemaFilePath, 'utf8');

      // Parse YAML to JavaScript object
      let schema = load(schemaContent) as any;

      if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid schema file: must be a valid YAML object');
      }

      // Apply updates
      for (const update of updates) {
        const { path, value } = update;
        this.setNestedProperty(schema, path, value);
      }

      // Convert back to YAML
      const updatedYaml = dump(schema, { indent: 2 });

      // Write back to file
      await fs.writeFile(schemaFilePath, updatedYaml, 'utf8');

      return {
        success: true,
        updatedSchema: schema,
        message: `Successfully updated schema file ${schemaFilePath} with ${updates.length} changes`
      };
    } catch (error) {
      return {
        success: false,
        updatedSchema: null,
        message: `Failed to update schema: ${error.message}`
      };
    }
  }

  private setNestedProperty(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }
}