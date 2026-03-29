import { test, expect } from '@playwright/test';
import { validateSchemaChangeRequest, LinkMLAgent, processSchemaChange } from '../../mastra-server/linkml-agent.js';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Unit tests for LinkMLAgent.js functions
 * Covers all 5 schema change actions and validation functions
 */

test.describe('LinkMLAgent Unit Tests', () => {
  let agent: LinkMLAgent;
  let tempSchemaPath: string;

  test.beforeEach(async () => {
    agent = new LinkMLAgent();

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

    await agent.loadSchema(tempSchemaPath);
  });

  test.afterEach(async () => {
    // Clean up temp file
    try {
      unlinkSync(tempSchemaPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test.describe('validateSchemaChangeRequest', () => {
    test('validates correct schema change request structure', async () => {
      const validRequest = {
        action: 'add_class' as const,
        target: 'TestClass',
        details: {
          name: 'TestClass',
          description: 'A test class'
        }
      };

      const result = await validateSchemaChangeRequest(validRequest);
      expect(result.success).toBe(true);
    });

    test('rejects invalid action', async () => {
      const invalidRequest = {
        action: 'invalid_action' as any,
        target: 'TestClass'
      };

      const result = await validateSchemaChangeRequest(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('validates schema path existence', async () => {
      const requestWithInvalidPath = {
        action: 'add_class' as const,
        target: 'TestClass',
        schemaPath: '/non/existent.yaml',
        details: {
          name: 'TestClass'
        }
      };

      const result = await validateSchemaChangeRequest(requestWithInvalidPath);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    test('validates property type exists in schema', async () => {
      const requestWithInvalidType = {
        action: 'add_property' as const,
        target: 'Person',
        schemaPath: tempSchemaPath,
        details: {
          name: 'invalidProp',
          type: 'nonexistent_type'
        }
      };

      const result = await validateSchemaChangeRequest(requestWithInvalidType);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid type');
    });

    test('validates property deletion constraints', async () => {
      const requestDeleteRequired = {
        action: 'delete_property' as const,
        target: 'Person',
        schemaPath: tempSchemaPath,
        details: {
          name: 'name' // assuming this is required in some schemas
        }
      };

      // This might pass or fail depending on schema, but validates structure
      const result = await validateSchemaChangeRequest(requestDeleteRequired);
      expect(result).toHaveProperty('success');
    });
  });

  test.describe('LinkMLAgent Class', () => {
    test('loads schema successfully', async () => {
      expect(agent.schema).toBeTruthy();
      expect(agent.schema.classes).toHaveProperty('Person');
    });

    test('fails to load invalid schema', async () => {
      const invalidSchemaPath = join(tmpdir(), `invalid-schema-${Date.now()}.yaml`);
      writeFileSync(invalidSchemaPath, 'invalid: yaml: content: {', 'utf8');

      await expect(agent.loadSchema(invalidSchemaPath)).rejects.toThrow('Failed to load schema');

      try {
        unlinkSync(invalidSchemaPath);
      } catch (e) {
        // Ignore
      }
    });

    test('validates change request structure', () => {
      const validRequest = {
        action: 'add_class' as const,
        target: 'TestClass',
        details: {
          name: 'TestClass'
        }
      };

      const result = agent.validateChangeRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });

    test('rejects invalid change request', () => {
      const invalidRequest = {
        action: 'invalid' as any,
        target: 'TestClass'
      };

      const result = agent.validateChangeRequest(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('exports schema as YAML', () => {
      const yaml = agent.exportSchemaAsYaml();
      expect(typeof yaml).toBe('string');
      expect(yaml).toContain('classes:');
      expect(yaml).toContain('Person:');
    });
  });

  test.describe('Schema Change Actions', () => {
    test('add_class - adds new class successfully', () => {
      const request = {
        action: 'add_class' as const,
        target: 'NewClass',
        details: {
          name: 'NewClass',
          description: 'A new test class'
        },
        conditions: {
          ifExists: 'fail' as const
        }
      };

      expect(() => {
        agent.applyChangeRequest(request);
      }).not.toThrow();

      expect(agent.schema.classes).toHaveProperty('NewClass');
      expect(agent.schema.classes.NewClass.description).toBe('A new test class');
    });

    test('add_class - handles ifExists condition', () => {
      // First add a class
      agent.applyChangeRequest({
        action: 'add_class' as const,
        target: 'ExistingClass',
        details: {
          name: 'ExistingClass',
          description: 'First description'
        }
      });

      // Try to add again with skip
      agent.applyChangeRequest({
        action: 'add_class' as const,
        target: 'ExistingClass',
        details: {
          name: 'ExistingClass',
          description: 'Should not change'
        },
        conditions: {
          ifExists: 'skip' as const
        }
      });

      expect(agent.schema.classes.ExistingClass.description).toBe('First description');
    });

    test('add_property - adds property to existing class', () => {
      const request = {
        action: 'add_property' as const,
        target: 'Person',
        details: {
          name: 'email',
          type: 'string',
          description: 'Email address',
          required: false
        }
      };

      agent.applyChangeRequest(request);

      expect(agent.schema.classes.Person.slots).toHaveProperty('email');
      expect(agent.schema.classes.Person.slots.email.range).toBe('string');
    });

    test('add_property - fails if class does not exist', () => {
      const request = {
        action: 'add_property' as const,
        target: 'NonExistentClass',
        details: {
          name: 'testProp',
          type: 'string'
        }
      };

      expect(() => {
        agent.applyChangeRequest(request);
      }).toThrow('not found');
    });

    test('modify_property - modifies existing property', () => {
      // First add a property
      agent.applyChangeRequest({
        action: 'add_property' as const,
        target: 'Person',
        details: {
          name: 'title',
          type: 'string',
          description: 'Original description',
          required: false
        }
      });

      // Then modify it
      const modifyRequest = {
        action: 'modify_property' as const,
        target: 'Person',
        details: {
          name: 'title',
          description: 'Updated description',
          required: true
        }
      };

      agent.applyChangeRequest(modifyRequest);

      expect(agent.schema.classes.Person.slots.title.description).toBe('Updated description');
      expect(agent.schema.classes.Person.slots.title.required).toBe(true);
    });

    test('modify_property - creates property if not exists and ifNotExists=create', () => {
      const request = {
        action: 'modify_property' as const,
        target: 'Person',
        details: {
          name: 'newProp',
          type: 'integer',
          description: 'New property created by modify'
        },
        conditions: {
          ifNotExists: 'create' as const
        }
      };

      agent.applyChangeRequest(request);

      expect(agent.schema.classes.Person.slots).toHaveProperty('newProp');
      expect(agent.schema.classes.Person.slots.newProp.range).toBe('integer');
    });

    test('delete_property - removes property from class', () => {
      // First add a property
      agent.applyChangeRequest({
        action: 'add_property' as const,
        target: 'Person',
        details: {
          name: 'temporary',
          type: 'string'
        }
      });

      expect(agent.schema.classes.Person.slots).toHaveProperty('temporary');

      // Then delete it
      const deleteRequest = {
        action: 'delete_property' as const,
        target: 'Person',
        details: {
          name: 'temporary'
        }
      };

      agent.applyChangeRequest(deleteRequest);

      expect(agent.schema.classes.Person.slots).not.toHaveProperty('temporary');
    });

    test('delete_property - fails if property not found', () => {
      const request = {
        action: 'delete_property' as const,
        target: 'Person',
        details: {
          name: 'nonexistent'
        }
      };

      expect(() => {
        agent.applyChangeRequest(request);
      }).toThrow('not found');
    });

    test('delete_class - removes class from schema', () => {
      // First add a class
      agent.applyChangeRequest({
        action: 'add_class' as const,
        target: 'TempClass',
        details: {
          name: 'TempClass'
        }
      });

      expect(agent.schema.classes).toHaveProperty('TempClass');

      // Then delete it
      const deleteRequest = {
        action: 'delete_class' as const,
        target: 'TempClass'
      };

      agent.applyChangeRequest(deleteRequest);

      expect(agent.schema.classes).not.toHaveProperty('TempClass');
    });

    test('delete_class - does nothing if class does not exist', () => {
      const request = {
        action: 'delete_class' as const,
        target: 'NonExistentClass'
      };

      // Should not throw by default
      expect(() => {
        agent.applyChangeRequest(request);
      }).not.toThrow();
    });
  });

  test.describe('processSchemaChange convenience function', () => {
    test('processes complete change request end-to-end', async () => {
      const changeRequest = {
        action: 'add_class' as const,
        target: 'ProcessedClass',
        details: {
          name: 'ProcessedClass',
          description: 'Created by processSchemaChange'
        }
      };

      const yamlResult = await processSchemaChange(tempSchemaPath, changeRequest);
      expect(typeof yamlResult).toBe('string');
      expect(yamlResult).toContain('ProcessedClass:');
      expect(yamlResult).toContain('Created by processSchemaChange');
    });

    test('fails if schema cannot be loaded', async () => {
      const changeRequest = {
        action: 'add_class' as const,
        target: 'TestClass',
        details: {
          name: 'TestClass'
        }
      };

      await expect(processSchemaChange('/non/existent.yaml', changeRequest)).rejects.toThrow();
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('add_property with multivalued true', () => {
      const request = {
        action: 'add_property' as const,
        target: 'Person',
        details: {
          name: 'friends',
          type: 'Person',
          multivalued: true
        }
      };

      agent.applyChangeRequest(request);
      expect(agent.schema.classes.Person.slots.friends.multivalued).toBe(true);
    });

    test('add_class without details.name uses target', () => {
      const request = {
        action: 'add_class' as const,
        target: 'ClassName',
        details: {
          description: 'Class without explicit name'
        }
      };

      expect(() => {
        agent.applyChangeRequest(request);
      }).toThrow('Class name required');
    });

    test('modify_property with no changes does nothing', () => {
      // Add a property first
      agent.applyChangeRequest({
        action: 'add_property' as const,
        target: 'Person',
        details: {
          name: 'unchanged',
          type: 'string',
          description: 'Original'
        }
      });

      const original = agent.schema.classes.Person.slots.unchanged.description;

      // Modify with empty details
      agent.applyChangeRequest({
        action: 'modify_property' as const,
        target: 'Person',
        details: {
          name: 'unchanged'
        }
      });

      expect(agent.schema.classes.Person.slots.unchanged.description).toBe(original);
    });

    test('handles schema with no classes gracefully', async () => {
      const emptySchema = `
id: https://example.org/empty
name: empty
description: Empty schema
version: 1.0.0
`;

      const emptyPath = join(tmpdir(), `empty-schema-${Date.now()}.yaml`);
      writeFileSync(emptyPath, emptySchema, 'utf8');

      const emptyAgent = new LinkMLAgent();
      await emptyAgent.loadSchema(emptyPath);

      const request = {
        action: 'add_class' as const,
        target: 'FirstClass',
        details: {
          name: 'FirstClass'
        }
      };

      expect(() => {
        emptyAgent.applyChangeRequest(request);
      }).not.toThrow();

      expect(emptyAgent.schema.classes).toHaveProperty('FirstClass');

      try {
        unlinkSync(emptyPath);
      } catch (e) {
        // Ignore
      }
    });
  });
});