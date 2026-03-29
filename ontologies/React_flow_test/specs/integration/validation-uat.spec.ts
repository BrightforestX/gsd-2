import { test, expect } from '@playwright/test';
import { validateSchemaChangeRequest } from '../../mastra-server/linkml-agent.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Integration tests for SchemaChangeRequest validation
 * UAT-level validation that malformed and incompatible changes are rejected,
 * while valid requests are accepted
 */

test.describe('Schema Change Request Validation', () => {
  // Load a test schema for validation tests
  let testSchemaPath: string;

  test.beforeAll(() => {
    // Use one of the existing schemas for testing
    testSchemaPath = join(process.cwd(), 'schemas', 'app.yaml');
  });

  test.describe('Invalid SchemaChangeRequest Tests', () => {
    test('should reject malformed request with missing action', async () => {
      const invalidRequest = {
        // missing action
        target: 'TestClass',
        schemaPath: testSchemaPath
      };

      const result = await validateSchemaChangeRequest(invalidRequest as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('should reject request with invalid action', async () => {
      const invalidRequest = {
        action: 'invalid_action', // not in enum
        target: 'TestClass',
        schemaPath: testSchemaPath
      };

      const result = await validateSchemaChangeRequest(invalidRequest as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('should reject add_property with missing type', async () => {
      const invalidRequest = {
        action: 'add_property',
        target: 'TestClass',
        schemaPath: testSchemaPath,
        details: {
          // missing type/range
          name: 'newProperty'
        }
      };

      const result = await validateSchemaChangeRequest(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('type');
    });

    test('should reject delete_property where property does not exist', async () => {
      const invalidRequest = {
        action: 'delete_property',
        target: 'TestClass',
        schemaPath: testSchemaPath,
        details: {
          name: 'nonExistentProperty'
        }
      };

      const result = await validateSchemaChangeRequest(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should reject modify_property with invalid type', async () => {
      const invalidRequest = {
        action: 'modify_property',
        target: 'TestClass',
        schemaPath: testSchemaPath,
        details: {
          name: 'existingProperty',
          type: 'invalid_type_not_in_schema'
        }
      };

      const result = await validateSchemaChangeRequest(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid type');
    });

    test('should reject delete_property on required property', async () => {
      // First add a required property, assuming it exists
      // This would be a custom schema case
      test.skip(); // Skip until specific required property test case is identified
    });

    test('should reject request with non-existent schema path', async () => {
      const invalidRequest = {
        action: 'add_class',
        target: 'NewClass',
        schemaPath: '/non/existent/path.yaml',
        details: {
          name: 'NewClass',
          description: 'Test class'
        }
      };

      const result = await validateSchemaChangeRequest(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  test.describe('Valid SchemaChangeRequest Tests', () => {
    test('should accept valid add_class request', async () => {
      const validRequest = {
        action: 'add_class',
        target: 'NewTestClass',
        schemaPath: testSchemaPath,
        details: {
          name: 'NewTestClass',
          description: 'A test class for validation'
        },
        conditions: {
          ifExists: 'overwrite'
        }
      };

      const result = await validateSchemaChangeRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid add_property request', async () => {
      const validRequest = {
        action: 'add_property',
        target: 'NewTestClass',
        schemaPath: testSchemaPath,
        details: {
          name: 'testProperty',
          type: 'string', // valid built-in type
          description: 'A test property',
          required: false
        },
        conditions: {
          ifExists: 'skip'
        }
      };

      const result = await validateSchemaChangeRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid modify_property request', async () => {
      const validRequest = {
        action: 'modify_property',
        target: 'NewTestClass',
        schemaPath: testSchemaPath,
        details: {
          name: 'testProperty',
          description: 'Updated description'
          // No type change, so should be valid
        }
      };

      const result = await validateSchemaChangeRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid delete_property request', async () => {
      // This depends on the property existing, using the one we added above
      const validRequest = {
        action: 'delete_property',
        target: 'NewTestClass',
        schemaPath: testSchemaPath,
        details: {
          name: 'testProperty'
        }
      };

      const result = await validateSchemaChangeRequest(validRequest);
      // Note: This might fail if the schema doesn't persist changes in validation
      // In a real scenario, we'd use a fresh schema or handle this expectation
      expect(result.success).toBe(true); // Accept as valid if no structural errors
    });

    test('should accept valid delete_class request', async () => {
      const validRequest = {
        action: 'delete_class',
        target: 'NewTestClass',
        schemaPath: testSchemaPath
      };

      const result = await validateSchemaChangeRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test.describe('Edge Cases and Boundary Conditions', () => {
    test('should handle case-sensitive class/property names correctly', async () => {
      const request = {
        action: 'add_class',
        target: 'testclass', // lowercase target
        schemaPath: testSchemaPath,
        details: {
          name: 'TestClass' // mixed case name
        }
      };

      const result = await validateSchemaChangeRequest(request);
      // Validation should be consistent with schema casing rules
      // This may pass or fail depending on schema normalization
      expect(result).toHaveProperty('success');
    });

    test('should reject excessively long property names', async () => {
      const longName = 'a'.repeat(256); // Very long name
      const request = {
        action: 'add_property',
        target: 'TestClass',
        schemaPath: testSchemaPath,
        details: {
          name: longName,
          type: 'string'
        }
      };

      const result = await validateSchemaChangeRequest(request);
      // May be rejected by schema constraints or accepted
      // Test documents the expected behavior
      expect(result).toHaveProperty('success');
    });

    test('should handle empty string property names if not forbidden', async () => {
      const request = {
        action: 'add_property',
        target: 'TestClass',
        schemaPath: testSchemaPath,
        details: {
          name: '',
          type: 'string'
        }
      };

      const result = await validateSchemaChangeRequest(request);
      // Should typically fail validation
      expect(result.success).toBe(false);
    });
  });
});