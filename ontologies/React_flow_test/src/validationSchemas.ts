import { z } from 'zod';

// Schema for LinkML class definition
const linkmlClassSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  description: z.string().max(500).optional(),
  title: z.string().min(1).max(100),
  slots: z.object({}).optional(),  // Will refine based on schema structure
  examples: z.array(z.any()).optional(),
  annotations: z.record(z.any()).optional()
});

// Schema for schema edit input
export const schemaEditInputSchema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  classId: z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  classDefinition: linkmlClassSchema.optional(),
  relationships: z.object({
    parents: z.array(z.string()).optional(),
    children: z.array(z.string()).optional(),
    slots: z.array(z.object({
      name: z.string(),
      range: z.string(),
      required: z.boolean().optional()
    })).optional()
  }).optional()
});

/**
 * Validates schema edit input using Zod schema
 */
export function validateSchemaEditInput(input: any) {
  try {
    const result = schemaEditInputSchema.safeParse(input);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      })),
      validated: result.success ? result.data : null
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{ field: 'input', message: 'Validation failed unexpectedly', code: 'unknown' }],
      validated: null
    };
  }
}

/**
 * Sanitizes and validates edit request from canvas UI
 */
export function validateCanvasEditRequest(request: any) {
  // Expecting format from canvas edit modal
  const normalized = {
    action: request.action || 'update',
    classId: request.nodeId || request.id,  // Handle different field names
    classDefinition: {
      name: request.className || request.name,
      description: request.description,
      title: request.displayName || request.title
    },
    relationships: request.relationships || {}
  };

  return validateSchemaEditInput(normalized);
}