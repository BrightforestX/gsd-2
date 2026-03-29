import { z } from 'zod';
import { SchemaChangeRequest } from './schemaParsers';

/**
 * Validation result with detailed error reporting
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Structured validation error
 */
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  expected?: any;
  actual?: any;
}

/**
 * Structured validation warning
 */
export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation schema for LinkML schema changes
 * Validates the overall structure and common LinkML patterns
 */
const linkmlClassSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  description: z.string().optional(),
  title: z.string().optional(),
  slots: z.union([
    z.array(z.string()),
    z.record(z.string(), z.unknown())
  ]).optional(),
  is_a: z.string().optional(),
  mixins: z.array(z.string()).optional(),
  annotations: z.record(z.string(), z.unknown()).optional()
});

const linkmlSlotSchema = z.object({
  range: z.string(),
  multivalued: z.boolean().optional(),
  required: z.boolean().optional(),
  description: z.string().optional()
});

const linkmlSchemaSchema = z.object({
  id: z.string().url().optional(),
  name: z.string(),
  prefixes: z.record(z.string(), z.unknown()),
  default_prefix: z.string(),
  imports: z.array(z.string()),
  classes: z.record(z.string(), linkmlClassSchema).optional(),
  slots: z.record(z.string(), linkmlSlotSchema).optional(),
  types: z.record(z.string(), z.unknown()).optional()
});

/**
 * Validates the syntax of a parsed schema change request
 *
 * Checks for:
 * - Valid class/slot names
 * - Proper LinkML structure
 * - Cross-references are valid strings
 * - No circular dependencies (basic check)
 */
export function validateSchemaChangeSyntax(request: SchemaChangeRequest): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Validate basic request structure
    if (!request.classId) {
      errors.push({
        field: 'classId',
        code: 'MISSING_CLASS_ID',
        message: 'Schema change request must specify a classId'
      });
    }

    if (!request.classDefinition?.name) {
      errors.push({
        field: 'classDefinition.name',
        code: 'MISSING_CLASS_NAME',
        message: 'Class definition must have a name'
      });
    }

    // Validate class name follows LinkML conventions
    if (request.classDefinition?.name) {
      const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
      if (!nameRegex.test(request.classDefinition.name)) {
        errors.push({
          field: 'classDefinition.name',
          code: 'INVALID_CLASS_NAME',
          message: 'Class name must start with a letter and contain only letters, numbers, and underscores',
          expected: 'Valid identifier like "Person" or "firecrawl_scrape_request"',
          actual: request.classDefinition.name
        });
      }
    }

    // Validate relationships structure
    if (request.relationships) {
      const rel = request.relationships;

      if (rel.parents) {
        if (typeof rel.parents === 'string') {
          warnings.push({
            field: 'relationships.parents',
            code: 'PARENTS_SHOULD_BE_ARRAY',
            message: 'Parents should be an array, treating as single parent',
            suggestion: 'Use: parents: ["ParentClass"]'
          });
        } else if (!Array.isArray(rel.parents)) {
          errors.push({
            field: 'relationships.parents',
            code: 'PARENTS_MUST_BE_ARRAY',
            message: 'Parents must be an array of class names'
          });
        } else {
          // Validate each parent reference
          rel.parents.forEach((parent, idx) => {
            if (typeof parent !== 'string') {
              errors.push({
                field: `relationships.parents[${idx}]`,
                code: 'PARENT_MUST_BE_STRING',
                message: 'Parent class references must be strings',
                expected: 'String like "core:Person"',
                actual: parent
              });
            }
          });
        }
      }

      if (rel.slots) {
        if (!Array.isArray(rel.slots)) {
          errors.push({
            field: 'relationships.slots',
            code: 'SLOTS_MUST_BE_ARRAY',
            message: 'Slots must be an array of slot definitions'
          });
        } else {
          rel.slots.forEach((slot, idx) => {
            if (!slot.name) {
              errors.push({
                field: `relationships.slots[${idx}].name`,
                code: 'SLOT_MISSING_NAME',
                message: 'Each slot must have a name'
              });
            }
            if (!slot.range) {
              warnings.push({
                field: `relationships.slots[${idx}].range`,
                code: 'SLOT_MISSING_RANGE',
                message: 'Slot without range type (assuming string)',
                suggestion: 'Add: range: "string"'
              });
            }
          });
        }
      }
    }

    // Check for potential issues
    if (request.classDefinition?.name && request.classId) {
      if (request.classDefinition.name !== request.classId) {
        warnings.push({
          field: 'classDefinition.name',
          code: 'NAME_ID_MISMATCH',
          message: 'Class name differs from classId',
          suggestion: 'Consider matching name with classId for consistency'
        });
      }
    }

    // Basic circular dependency detection (very rudimentary)
    if (request.relationships?.parents &&
        Array.isArray(request.relationships.parents) &&
        request.classId &&
        request.relationships.parents.includes(request.classId)) {
      errors.push({
        field: 'relationships.parents',
        code: 'CIRCULAR_DEPENDENCY_DETECTED',
        message: 'Class cannot inherit from itself'
      });
    }

  } catch (error) {
    errors.push({
      field: 'request',
      code: 'VALIDATION_ERROR',
      message: `Syntax validation failed: ${error.message}`
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a full LinkML schema document (more comprehensive)
 * This could be used when reading existing schema files
 */
export function validateSchemaDocument(schemaDoc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Validate schema structure using Zod
    const result = linkmlSchemaSchema.safeParse(schemaDoc);

    if (!result.success) {
      result.error.errors.forEach(zodError => {
        errors.push({
          field: zodError.path.join('.'),
          code: 'SCHEMA_STRUCTURE_ERROR',
          message: zodError.message,
          expected: zodError.expected?.toString(),
          actual: zodError.received
        });
      });
    }

    // Additional semantic validations
    if (schemaDoc.classes) {
      Object.entries(schemaDoc.classes).forEach(([className, classDef]: [string, any]) => {
        // Check for missing descriptions
        if (!classDef.description) {
          warnings.push({
            field: `classes.${className}.description`,
            code: 'MISSING_DESCRIPTION',
            message: 'Class should have a description',
            suggestion: 'Add: description: "Brief explanation of this class"'
          });
        }

        // Validate slot references
        if (classDef.slots && Array.isArray(classDef.slots)) {
          classDef.slots.forEach((slot: any, idx: number) => {
            if (typeof slot === 'string') {
              // Reference to global slot - should exist in schema.slots
              if (!schemaDoc.slots?.[slot]) {
                errors.push({
                  field: `classes.${className}.slots[${idx}]`,
                  code: 'UNDEFINED_SLOT',
                  message: `Slot "${slot}" not defined in schema.slots`,
                  expected: 'Defined slot name',
                  actual: slot
                });
              }
            }
          });
        }
      });
    }

  } catch (error) {
    errors.push({
      field: 'document',
      code: 'VALIDATION_ERROR',
      message: `Schema validation failed: ${error.message}`
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}