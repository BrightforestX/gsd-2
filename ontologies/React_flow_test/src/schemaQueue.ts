import { SchemaChangeRequest } from './schemaParsers';
import { ValidationResult } from './schemaValidators';
import { workflowProcessor } from './workflowIntegration';

/**
 * Queue entry combining validated schema change with metadata
 */
export interface QueuedSchemaChange {
  id: string;
  request: SchemaChangeRequest;
  validation: ValidationResult;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high';
  status: 'queued' | 'processing' | 'failed' | 'completed';
  retries: number;
  lastError?: string;
}

/**
 * In-memory queue for schema changes (suitable for development/demo)
 * In production, this would be backed by Redis, database, or message queue
 */
class SchemaChangeQueue {
  private queue: Map<string, QueuedSchemaChange> = new Map();
  private processing: Set<string> = new Set();
  private readonly maxRetries = 3;

  /**
   * Add a validated schema change to the queue
   */
  enqueue(request: SchemaChangeRequest, validation: ValidationResult, priority: 'low' | 'normal' | 'high' = 'normal'): string {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry: QueuedSchemaChange = {
      id,
      request,
      validation,
      timestamp: new Date(),
      priority,
      status: 'queued',
      retries: 0
    };

    this.queue.set(id, entry);

    console.log(`📋 Queued schema change: ${id} (${request.classId}) - Priority: ${priority}`);
    console.log(`   Validation: ${validation.isValid ? 'PASS' : 'FAIL with ' + validation.errors.length + ' errors'}`);

    return id;
  }

  /**
   * Get next item for processing (priority order)
   */
  dequeue(): QueuedSchemaChange | null {
    const queued = Array.from(this.queue.values())
      .filter(item => item.status === 'queued' && !this.processing.has(item.id))
      .sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));

    if (queued.length === 0) return null;

    const item = queued[0];
    item.status = 'processing';
    this.processing.add(item.id);

    console.log(`🔄 Processing queued schema change: ${item.id} (${item.request.classId})`);

    return item;
  }

  /**
   * Mark item as completed successfully
   */
  markCompleted(id: string): boolean {
    const item = this.queue.get(id);
    if (!item) return false;

    item.status = 'completed';
    this.processing.delete(id);

    console.log(`✅ Schema change completed: ${id} (${item.request.classId})`);
    return true;
  }

  /**
   * Mark item as failed (will retry or give up based on retry count)
   */
  markFailed(id: string, error: string): boolean {
    const item = this.queue.get(id);
    if (!item) return false;

    item.retries++;
    item.lastError = error;

    if (item.retries >= this.maxRetries) {
      item.status = 'failed';
      this.processing.delete(id);
      console.log(`❌ Schema change failed permanently: ${id} after ${item.retries} retries`);
      console.log(`   Last error: ${error}`);
    } else {
      item.status = 'queued';
      this.processing.delete(id);
      console.log(`⚠️ Schema change failed: ${id} (${item.retries}/${this.maxRetries} retries)`);
      console.log(`   Will retry. Error: ${error}`);
    }

    return true;
  }

  /**
   * Get current status of a queue item
   */
  getStatus(id: string): QueuedSchemaChange | null {
    return this.queue.get(id) || null;
  }

  /**
   * Get all items (for monitoring/debugging)
   */
  getAll(): QueuedSchemaChange[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const stats = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: this.queue.size
    };

    for (const item of this.queue.values()) {
      stats[item.status]++;
    }

    return stats;
  }

  /**
   * Clear completed items older than specified hours
   */
  cleanup(hoursOld: number = 24): number {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, item] of this.queue) {
      if (item.status === 'completed' || item.status === 'failed') {
        if (item.timestamp < cutoff) {
          this.queue.delete(id);
          removed++;
        }
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old queue items`);
    }

    return removed;
  }

  private getPriorityScore(item: QueuedSchemaChange): number {
    const priorityScores = { high: 3, normal: 2, low: 1 };
    const timeBonus = 1 / (Date.now() - item.timestamp.getTime()); // Older items get higher priority
    return priorityScores[item.priority] + timeBonus;
  }
}

// Singleton instance for the application
export const schemaChangeQueue = new SchemaChangeQueue();

// Export types for external use
export type { QueuedSchemaChange };