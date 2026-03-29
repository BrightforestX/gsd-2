import { chatRoute } from '@mastra/ai-sdk';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { gsdSchemaAgent } from './agents/gsd-schema-agent';

/**
 * Dev: `npx mastra dev` → Studio at http://localhost:4111 ; bundled REST under /api
 * `chatRoute({ path: '/chat/:agentId' })` is mounted at the host root → POST /chat/gsdSchemaAgent
 * (Vite proxies /api/mastra/chat/… → that path.)
 *
 * No `storage` here: with LibSQL + AI SDK v6 UI messages, Mastra's memory prepare step can reload
 * thread history in `parts` shape and reject "system" rows unless they are CoreMessage `content`.
 * Add `LibSQLStore` back when you need persistence and align formats / memory config with Mastra docs.
 *
 * Schema update workflow (`src/workflows/schemaUpdateWorkflow.ts`) is not registered until it is
 * migrated to the current Mastra workflow API (`createWorkflow` / `createStep` from
 * `@mastra/core/workflows`, and `workflows: { id: instance }` on Mastra). The previous registration
 * caused runtime failures and 500s on `/chat/*`.
 */
export const mastra = new Mastra({
  agents: { gsdSchemaAgent },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  server: {
    apiRoutes: [
      chatRoute({
        path: '/chat/:agentId',
        version: 'v6',
      }),
    ],
  },
});
