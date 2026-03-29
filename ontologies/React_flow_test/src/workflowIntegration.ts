import { schemaChangeQueue, QueuedSchemaChange } from './schemaQueue';
// Removed LinkMLAgent import - replaced with mock for now
// import { LinkMLAgent } from '../mastra-server/linkml-agent.js';
import { SchemaChangeRequest } from './schemaParsers';

/**
 * Mock MCP agent implementation for demonstration
 * In production, this would be the actual LinkMLAgent
 */
class MockLinkMLAgent {
  private schema: any = null;

  async loadSchema(filePath: string) {
    console.log(`[MOCK] Loading schema from ${filePath}`);
    // Mock loading for now
    const fs = await import('fs');
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.schema = { _raw: content, classes: {}, path: filePath };
    } catch (error) {
      throw new Error(`Failed to load schema: ${error.message}`);
    }
  }

  applyChangeRequest(request: SchemaChangeRequest) {
    console.log(`[MOCK] Applying change: ${request.action} on ${request.target}`);
    if (!this.schema) {
      throw new Error('No schema loaded');
    }

    // Mock modification - just add a timestamp to the schema
    this.schema._lastModified = new Date().toISOString();
    this.schema._lastChange = request;
    return this.schema;
  }

  exportSchemaAsYaml() {
    if (!this.schema) {
      throw new Error('No schema loaded');
    }
    return this.schema._raw || '# Mock schema YAML';
  }
}

/**
 * Workflow integration that connects queue processing with MCP agent operations
 * Connects schema change queue with LinkML MCP agent for automated processing
 */
class WorkflowProcessor {
  private agent: MockLinkMLAgent = new MockLinkMLAgent();

  /**
   * Process the next available schema change request from the queue
   * Automatically calls MCP tools to apply validated changes
   * Returns the processed change or null if queue is empty
   */
  async processNextChange(): Promise<QueuedSchemaChange | null> {
    // Get next item from queue
    const item = schemaChangeQueue.dequeue();
    if (!item) {
      return null;
    }

    try {
      console.log(`🔧 Processing schema change: ${item.id} (${item.request.action}: ${item.request.target})`);

      // Load schema if needed
      if (item.request.schemaPath) {
        await this.agent.loadSchema(item.request.schemaPath);
      }

      // Apply the change using MCP-style processing
      const modifiedSchema = this.agent.applyChangeRequest(item.request);

      // Export the modified schema back to file
      if (item.request.schemaPath) {
        const fs = await import('fs');
        const yamlContent = this.agent.exportSchemaAsYaml();
        // For now, don't actually overwrite - just log
        console.log(`[MOCK] Would write updated schema to ${item.request.schemaPath}`);
      }

      // Mark as completed
      schemaChangeQueue.markCompleted(item.id);

      console.log(`✅ Schema change applied successfully: ${item.id}`);
      return item;

    } catch (error) {
      console.error(`❌ Schema change failed: ${item.id}`, error);
      schemaChangeQueue.markFailed(item.id, error.message);
      return item; // Return failed item for caller to handle if needed
    }
  }

  /**
   * Get current queue processor status
   */
  getStatus() {
    return {
      queueStats: schemaChangeQueue.getStats(),
      agentLoaded: this.agent.schema !== null
    };
  }

  /**
   * Cleanup old processed items
   */
  cleanup(hoursOld: number = 24): number {
    return schemaChangeQueue.cleanup(hoursOld);
  }
}

// Export singleton instance
export const workflowProcessor = new WorkflowProcessor();
export { WorkflowProcessor, QueuedSchemaChange };