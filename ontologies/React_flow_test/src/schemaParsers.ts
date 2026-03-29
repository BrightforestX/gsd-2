/**
 * Parses canvas edit modal data into workflow-compatible schema change objects
 */
export interface CanvasEditData {
  nodeId: string;
  nodeLabel?: string;
  className: string;
  description: string;
  displayName: string;
  relationships?: {
    parents?: string[];
    slots?: Array<{name: string, range: string, required?: boolean}>;
  };
  metadata?: Record<string, any>;
}

export interface SchemaChangeRequest {
  action: 'create' | 'update' | 'delete';
  classId: string;
  classDefinition?: {
    name: string;
    description?: string;
    title?: string;
    slots?: Record<string, any>;
  };
  relationships?: {
    parents?: string[];
    children?: string[];
    slots?: Array<{name: string, range: string, required?: boolean}>;
  };
  metadata: {
    source: 'canvas-ui';
    timestamp: string;
    parsedBy: string;
  };
}

/**
 * Parses data from canvas edit modal into schema change request
 */
export function parseCanvasEditData(canvasData: CanvasEditData): SchemaChangeRequest {
  const changeRequest: SchemaChangeRequest = {
    action: 'update', // Default to update, determine from context
    classId: canvasData.nodeId,
    classDefinition: {
      name: canvasData.className,
      description: canvasData.description,
      title: canvasData.displayName || canvasData.className,
      slots: canvasData.relationships?.slots?.reduce((acc, slot) => {
        acc[slot.name] = {
          range: slot.range,
          required: slot.required ?? false,
          multivalued: false // Default assumption
        };
        return acc;
      }, {} as Record<string, any>) || {}
    },
    relationships: {
      parents: canvasData.relationships?.parents || [],
      children: [], // Inferred from canvas connections
      slots: canvasData.relationships?.slots || []
    },
    metadata: {
      source: 'canvas-ui',
      timestamp: new Date().toISOString(),
      parsedBy: 'gsd-2 workflow v1'
    }
  };

  // Log parsing for observability
  console.log('Parsed canvas edit data:', {
    nodeId: canvasData.nodeId,
    className: canvasData.className,
    hasRelationships: !!canvasData.relationships,
    slotsCount: canvasData.relationships?.slots?.length || 0
  });

  return changeRequest;
}

/**
 * Converts a parsed schema change request to workflow step input
 */
export function convertToWorkflowInput(changeRequest: SchemaChangeRequest) {
  return {
    schemaChange: changeRequest,
    priority: 'normal',
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

/**
 * Validates the parsed change request against expected structure
 */
export function validateParsedRequest(request: SchemaChangeRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.classId) errors.push('Missing classId');
  if (!request.classDefinition?.name) errors.push('Missing class name');

  // Validate name format (same as in validationSchemas)
  if (request.classDefinition?.name) {
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!nameRegex.test(request.classDefinition.name)) {
      errors.push('Invalid class name format');
    }
  }

  // Check for empty relationships
  if (request.relationships) {
    if (!Array.isArray(request.relationships.parents)) {
      errors.push('Parents must be an array');
    }
    if (!Array.isArray(request.relationships.slots)) {
      errors.push('Slots must be an array');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}