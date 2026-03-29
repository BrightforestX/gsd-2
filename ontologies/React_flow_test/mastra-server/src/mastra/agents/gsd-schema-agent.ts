import { createGroq } from '@ai-sdk/groq';
import { Agent } from '@mastra/core/agent';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? '',
});

/** Agent id must match the URL segment: POST /chat/gsdSchemaAgent (see chatRoute path). */
export const gsdSchemaAgent = new Agent({
  id: 'gsdSchemaAgent',
  name: 'GSD schema assistant',
  instructions: `You are an expert on LinkML, capability modeling, and the GSD (Get Stuff Done) ontology.
Help with classes, slots, enums, environment variables, hooks, MCP servers, and research artifacts.
When the user wants structured data (lists of phases, slots, env vars), reply with valid JSON or a fenced \`\`\`json block.
Be concise and accurate.`,
  model: groq('llama-3.3-70b-versatile'),
});
