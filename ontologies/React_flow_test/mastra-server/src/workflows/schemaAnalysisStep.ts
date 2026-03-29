import { Step } from '@mastra/core';
import { MCPClient } from '@mastra/mcp';
import { promises as fs } from 'fs';
import { load } from 'js-yaml';
import { z } from 'zod';

const SchemaAnalysisInputSchema = z.object({
  schemaFilePath: z.string().describe('Path to the LinkML schema file to analyze')
});

const SchemaAnalysisOutputSchema = z.object({
  analysis: z.any(),
  proposals: z.any(),
  originalSchema: z.any(),
  success: z.boolean()
});

export class SchemaAnalysisStep extends Step<typeof SchemaAnalysisInputSchema, typeof SchemaAnalysisOutputSchema> {
  name = 'schema_analysis_step';
  description = 'Analyzes LinkML schema using MCP coding agent for intelligent insights and update proposals';

  inputSchema = SchemaAnalysisInputSchema;
  outputSchema = SchemaAnalysisOutputSchema;

  private mcpClient?: MCPClient;

  async execute({ context }) {
    const { schemaFilePath } = context.input;

    try {
      // Read and parse the schema file
      const schemaContent = await fs.readFile(schemaFilePath, 'utf8');
      const schema = load(schemaContent) as any;

      if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid schema file: must be a valid YAML object');
      }

      // Initialize MCP client if not already done
      if (!this.mcpClient) {
        this.mcpClient = new MCPClient({
          name: 'mastra-workflow-client',
          version: '1.0.0',
        });
        await this.mcpClient.start({
          serverCommand: 'npx',
          serverArgs: ['tsx', 'src/mcp/codingAgentServer.ts'],
          cwd: process.cwd(),
        });
      }

      // Call MCP tool for analysis
      const analysisResult = await this.mcpClient.callTool('analyze_schema_requirements', {
        schema: schema
      });

      let analysis: any = {};
      if (analysisResult?.content?.[0]?.type === 'text') {
        try {
          analysis = JSON.parse(analysisResult.content[0].text);
        } catch (e) {
          console.warn('Failed to parse MCP analysis response, using default');
          analysis = { analysis: 'Unable to parse analysis', requirements: [], recommendations: [] };
        }
      }

      // Call MCP tool for proposals
      const proposalsResult = await this.mcpClient.callTool('generate_schema_proposals', {
        analysis: analysis
      });

      let proposals: any = {};
      if (proposalsResult?.content?.[0]?.type === 'text') {
        try {
          proposals = JSON.parse(proposalsResult.content[0].text);
        } catch (e) {
          console.warn('Failed to parse MCP proposals response, using default');
          proposals = { proposals: 'Unable to parse proposals', updates: [] };
        }
      }

      return {
        analysis,
        proposals,
        originalSchema: schema,
        success: true
      };

    } catch (error) {
      console.error('MCP analysis failed:', error);
      return {
        analysis: { error: error.message },
        proposals: { error: 'Analysis failed, cannot generate proposals' },
        originalSchema: null,
        success: false
      };
    }
  }
}