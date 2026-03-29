import { SchemaChangeRequest } from './schemaParsers';
import { ValidationResult } from './schemaValidators';
import { schemaChangeQueue } from './schemaQueue';

/**
 * Validates that the schema change request and validation result are compatible
 * Ensures validation passed and the request matches what was validated
 */
function validateCompatibility(request: SchemaChangeRequest, validation: ValidationResult): void {
  if (!validation.isValid) {
    throw new Error(`Cannot queue invalid schema change: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  if (!request.classId) {
    throw new Error('Schema change request must have a classId');
  }

  // Additional compatibility checks could go here
}

/**
 * Queues a validated schema change request for downstream agent processing
 * Validates compatibility, enqueues the request, and returns the queue ID
 *
 * @param request The validated schema change request
 * @param validation The validation result confirming the request is valid
 * @returns The queue ID for tracking this request
 */
export function queueValidatedSchemaChange(request: SchemaChangeRequest, validation: ValidationResult): string {
  // Validate compatibility between request and validation
  validateCompatibility(request, validation);

  // Enqueue the validated request, preserving the validation data
  const queueId = schemaChangeQueue.enqueue(request, validation, 'normal');

  console.log(`🚀 Schema change queued for agent processing: ${queueId} (${request.classId})`);

  return queueId;
}