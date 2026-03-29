import { Step } from '@mastra/core';
import { promises as fs } from 'fs';
import { dump } from 'js-yaml';
import { z } from 'zod';

const SchemaGenerationInputSchema = z.object({
  updatedSchema: z.any().describe('The updated schema object'),
  outputPath: z.string().describe('Path where to write the generated schema file')
});

const SchemaGenerationOutputSchema = z.object({
  success: z.boolean(),
  outputPath: z.string(),
  message: z.string()
});

export class SchemaGenerationStep extends Step<typeof SchemaGenerationInputSchema, typeof SchemaGenerationOutputSchema> {
  name = 'schema_generation_step';
  description = 'Generates and writes the final updated LinkML schema file';

  inputSchema = SchemaGenerationInputSchema;
  outputSchema = SchemaGenerationOutputSchema;

  async execute({ context }) {
    const { updatedSchema, outputPath } = context.input;

    try {
      // Convert schema object back to YAML
      const yamlContent = dump(updatedSchema, { indent: 2 });

      // Write the schema file
      await fs.writeFile(outputPath, yamlContent, 'utf8');

      return {
        success: true,
        outputPath,
        message: `Successfully generated schema file at ${outputPath}`
      };
    } catch (error) {
      return {
        success: false,
        outputPath: '',
        message: `Failed to generate schema file: ${error.message}`
      };
    }
  }
}