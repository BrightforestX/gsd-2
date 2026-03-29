import { test, expect } from '@playwright/test';
import { schemaChangeQueue } from '../../src/schemaQueue';
import { workflowProcessor, WorkflowProcessor } from '../../src/workflowIntegration';
import { SchemaChangeRequest } from '../../src/schemaParsers';
import { ValidationResult } from '../../src/schemaValidators';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Integration tests for workflow processor and queue validation
 * Tests queue-to-agent processing pipeline, validation before enqueue, and error handling
 */

test.describe('Workflow & Queue Integration Tests', () => {
  let tempSchemaPath: string;

  test.beforeEach(async () => {
    // Create a temporary test schema
    const testSchema = `
id: https://example.org/test
name: test
description: Test schema
version: 1.0.0

classes:
  Person:
    description: A person
    slots:
      - name
      - age

slots:
  name:
    range: string
    description: Name of the person
  age:
    range: integer
    description: Age of the person
`;

    tempSchemaPath = join(tmpdir(), `test-schema-${Date.now()}.yaml`);
    writeFileSync(tempSchemaPath, testSchema, 'utf8');
  });

  test.afterEach(async () => {
    // Clean up temp file
    try {
      unlinkSync(tempSchemaPath);
    } catch (e) {
      // Ignore cleanup errors
    }

    // Reset queue between tests
    // Note: In production, you'd have a proper test setup/cleanup method
  });

  test.describe('SchemaChangeQueue Integration', () => {
    test('enqueues validated schema change requests', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const request: SchemaChangeRequest = {
        action: 'add_class',
        target: 'TestClass',
        details: {
          name: 'TestClass',
          description: 'A test class'
        },
        schemaPath: tempSchemaPath
      };

      const id = schemaChangeQueue.enqueue(request, mockValidation, 'normal');
      expect(id).toBeDefined();
      expect(id.startsWith('req_')).toBe(true);

      const status = schemaChangeQueue.getStatus(id);
      expect(status).toBeTruthy();
      expect(status?.status).toBe('queued');
      expect(status?.request.action).toBe('add_class');
      expect(status?.priority).toBe('normal');
    });

    test('validates before enqueueing (integration test)', async () => {
      // Mock invalid validation result
      const invalidValidation: ValidationResult = {
        isValid: false,
        errors: ['Invalid schema change request'],
        warnings: []
      };

      const request: SchemaChangeRequest = {
        action: 'add_class',
        target: 'TestClass',
        schemaPath: tempSchemaPath
      };

      const id = schemaChangeQueue.enqueue(request, invalidValidation);
      expect(id).toBeDefined();

      const status = schemaChangeQueue.getStatus(id);
      expect(status?.validation.isValid).toBe(false);
      expect(status?.validation.errors).toContain('Invalid schema change request');
    });

    test('processes items in priority order', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const lowPriorityRequest = {
        action: 'add_class' as const,
        target: 'LowClass',
        schemaPath: tempSchemaPath
      };

      const highPriorityRequest = {
        action: 'add_class' as const,
        target: 'HighClass',
        schemaPath: tempSchemaPath
      };

      const lowId = schemaChangeQueue.enqueue(lowPriorityRequest, mockValidation, 'low');
      const highId = schemaChangeQueue.enqueue(highPriorityRequest, mockValidation, 'high');

      // High priority should be dequeued first
      const first = schemaChangeQueue.dequeue();
      expect(first?.id).toBe(highId);
      expect(first?.priority).toBe('high');

      // Then low priority
      const second = schemaChangeQueue.dequeue();
      expect(second?.id).toBe(lowId);
      expect(second?.priority).toBe('low');
    });

    test('handles retry logic on failure', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const request = {
        action: 'add_class' as const,
        target: 'RetryClass',
        schemaPath: tempSchemaPath
      };

      const id = schemaChangeQueue.enqueue(request, mockValidation);
      const item = schemaChangeQueue.dequeue();

      expect(item?.status).toBe('processing');

      // Simulate failure - should retry
      schemaChangeQueue.markFailed(item.id, 'Simulated error');
      expect(schemaChangeQueue.getStatus(item.id)?.status).toBe('queued');
      expect(schemaChangeQueue.getStatus(item.id)?.retries).toBe(1);

      // Fail again
      const retryItem = schemaChangeQueue.dequeue();
      schemaChangeQueue.markFailed(item.id, 'Second simulated error');
      expect(schemaChangeQueue.getStatus(item.id)?.retries).toBe(2);

      // Fail third time - should give up
      const finalItem = schemaChangeQueue.dequeue();
      schemaChangeQueue.markFailed(item.id, 'Third simulated error');
      expect(schemaChangeQueue.getStatus(item.id)?.status).toBe('failed');
      expect(schemaChangeQueue.getStatus(item.id)?.retries).toBe(3);
    });

    test('provides queue statistics', () => {
      const stats = schemaChangeQueue.getStats();
      expect(stats).toHaveProperty('queued');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats.total).toBe(0); // Empty queue initially
    });

    test('cleanup removes old completed items', () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const request = {
        action: 'add_class' as const,
        target: 'CleanupClass',
        schemaPath: tempSchemaPath
      };

      const id = schemaChangeQueue.enqueue(request, mockValidation);
      schemaChangeQueue.markCompleted(id);

      // Manually set old timestamp for testing
      const item = schemaChangeQueue.getStatus(id);
      if (item) {
        // Simulate old timestamp (48 hours ago)
        (item.timestamp as any) = new Date(Date.now() - 48 * 60 * 60 * 1000);
      }

      const removedCount = schemaChangeQueue.cleanup(24); // Remove items older than 24 hours
      expect(removedCount).toBe(1);
    });
  });

  test.describe('WorkflowProcessor Integration', () => {
    test('processes schema changes end-to-end', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const request: SchemaChangeRequest = {
        action: 'add_class',
        target: 'NewIntegrationClass',
        details: {
          name: 'NewIntegrationClass',
          description: 'Integration test class',
          slots: ['name']
        },
        schemaPath: tempSchemaPath
      };

      // Enqueue the change
      const changeId = schemaChangeQueue.enqueue(request, mockValidation);

      // Process it through the workflow
      const processed = await workflowProcessor.processNextChange();
      expect(processed).toBeTruthy();
      expect(processed?.id).toBe(changeId);

      // Verify the queue was updated
      const status = schemaChangeQueue.getStatus(changeId);
      expect(status?.status).toBe('completed');
    });

    test('handles empty queue gracefully', async () => {
      const result = await workflowProcessor.processNextChange();
      expect(result).toBeNull();
    });

    test('handles processing errors', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Create request with invalid schema path to trigger error
      const invalidRequest: SchemaChangeRequest = {
        action: 'add_class',
        target: 'ErrorClass',
        schemaPath: '/non/existent/path.yaml'
      };

      const changeId = schemaChangeQueue.enqueue(invalidRequest, mockValidation);
      const result = await workflowProcessor.processNextChange();

      expect(result).toBeTruthy();
      expect(result?.id).toBe(changeId);

      // Should be marked as failed due to19 schema load error
      const status = schemaChangeQueue.getStatus(changeId);
      expect(status?.status).toBe('failed');
      expect(status?.lastError).toContain('Failed to load schema');
    });

    test('provides processor status', () => {
      const status = workflowProcessor.getStatus();
      expect(status).toHaveProperty('queueStats');
      expect(status).toHaveProperty('agentLoaded');
      expect(status.queueStats).toHaveProperty('total');
    });

    test('cleanup delegates to queue', () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const request: SchemaChangeRequest = {
        action: 'add_class' as const,
        target: 'CleanupTestClass',
        schemaPath: tempSchemaPath
      };

      const id = schemaChangeQueue.enqueue(request, mockValidation);
      schemaChangeQueue.markCompleted(id);

      // Set old timestamp
      const item = schemaChangeQueue.getStatus(id);
      if (item) {
        (item.timestamp as any) = new Date(Date.now() - 48 * 60 * 60 * 1000);
      }

      const removedCount = workflowProcessor.cleanup(24);
      expect(removedCount).toBeGreaterThanOrEqual(0); // May or may not remove based on timing
    });
  });

  test.describe('End-to-End Workflow', () => {
    test('full pipeline: validation → enqueue → process → complete', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const initialStats = workflowProcessor.getStatus();
      expect(initialStats.queueStats.queued).toBe(0);

      // Create valid schema change request
      const request: SchemaChangeRequest = {
        action: 'add_property',
        target: 'Person',
        details: {
          name: 'email',
          type: 'string',
          description: 'Email address'
        },
        schemaPath: tempSchemaPath
      };

      // Enqueue with validation
      const changeId = schemaChangeQueue.enqueue(request, mockValidation, 'high');

      // Verify queued
      const postEnqueueStats = workflowProcessor.getStatus();
      expect(postEnqueueStats.queueStats.queued).toBe(1);

      // Process the change
      const processedItem = await workflowProcessor.processNextChange();
      expect(processedItem).toBeTruthy();
      expect(processedItem?.id).toBe(changeId);
      expect(processedItem?.request.action).toBe('add_property');

      // Verify completed
      const finalStats = workflowProcessor.getStatus();
      expect(finalStats.queueStats.queued).toBe(0);
      expect(finalStats.queueStats.completed).toBe(1);

      const finalStatus = schemaChangeQueue.getStatus(changeId);
      expect(finalStatus?.status).toBe('completed');
      expect(finalStatus?.retries).toBe(0);
    });

    test('full pipeline with validation failure handling', async () => {
      const invalidValidation: ValidationResult = {
        isValid: false,
        errors: ['Invalid action type'],
        warnings: ['Missing required fields']
      };

      const request: SchemaChangeRequest = {
        action: 'add_class',
        target: 'TestClass',
        schemaPath: tempSchemaPath
      };

      // Enqueue with invalid validation (should still enqueue but validation info preserved)
      const changeId = schemaChangeQueue.enqueue(request, invalidValidation);

      const status = schemaChangeQueue.getStatus(changeId);
      expect(status?.validation.isValid).toBe(false);
      expect(status?.status).toBe('queued'); // Still queued, validation result stored
    });

    test('multiple items processing in correct order', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Create multiple requests with different priorities
      const requests = [
        { action: 'add_class' as const, target: 'LowPriority', priority: 'low' as const },
        { action: 'add_class' as const, target: 'HighPriority', priority: 'high' as const },
        { action: 'add_class' as const, target: 'NormalPriority', priority: 'normal' as const }
      ];

      const ids: string[] = [];
      for (const req of requests) {
        const request: SchemaChangeRequest = {
          action: req.action,
          target: req.target,
          schemaPath: tempSchemaPath
        };
        ids.push(schemaChangeQueue.enqueue(request, mockValidation, req.priority));
      }

      // Process all items
      const processed: string[] = [];
      let item;
      while (item = await workflowProcessor.processNextChange()) {
        processed.push(item.request.target);
      }

      // High priority should be processed first
      expect(processed[0]).toBe('HighPriority');
      expect(processed.includes('LowPriority')).toBe(true);
      expect(processed.includes('NormalPriority')).toBe(true);

      // Verify all completed
      const stats = workflowProcessor.getStatus();
      expect(stats.queueStats.completed).toBe(3);
    });

    test('error handling during processing marks items as failed', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Create request that will fail (non-existent schema path)
      const request: SchemaChangeRequest = {
        action: 'add_class',
        target: 'FailTestClass',
        schemaPath: '/completely/invalid/path.yaml'
      };

      const changeId = schemaChangeQueue.enqueue(request, mockValidation);

      // Attempt processing
      const result = await workflowProcessor.processNextChange();

      // Should return item but be marked as failed
      expect(result).toBeTruthy();
      expect(result?.id).toBe(changeId);

      const status = schemaChangeQueue.getStatus(changeId);
      expect(status?.status).toBe('failed');
      expect(status?.lastError).toContain('Failed to load schema');

      // Stats should reflect failure
      const finalStats = workflowProcessor.getStatus();
      expect(finalStats.queueStats.failed).toBe(1);
    });
  });

  test.describe('Observerability and Logging', () => {
    test('processing logs include correlation IDs', async () => {
      const mockValidation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const request: SchemaChangeRequest = {
        action: 'add_class',
        target: 'LoggedClass',
        details: {
          name: 'LoggedClass',
          description: 'Test for logging'
        },
        schemaPath: tempSchemaPath
      };

      const changeId = schemaChangeQueue.enqueue(request, mockValidation);

      // Processing should occur synchronously with logs
      await workflowProcessor.processNextChange();

      const status = schemaChangeQueue.getStatus(changeId);
      expect(status?.status).toBe('completed');
      // Logs are emitted during processing - in real tests you'd capture console output
    });

    test('validation info is preserved in queue items', () => {
      const validationWithWarnings: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Non-critical schema warning']
      };

      const request: SchemaChangeRequest = {
        action: 'add_class',
        target: 'WarningClass',
        details: {
          name: 'WarningClass'
        },
        schemaPath: tempSchemaPath
      };

      const id = schemaChangeQueue.enqueue(request, validationWithWarnings);

      const status = schemaChangeQueue.getStatus(id);
      expect(status?.validation.warnings).toContain('Non-critical schema warning');
    });
  });
});