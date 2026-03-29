import { loadSchema } from '@linkml/linkml';
import { z } from 'zod';

/**
 * Zod schema for SchemaChangeRequest validation
 */
/**
 * @typedef {Object} SchemaChangeRequest
 * @property {string} action - The action to perform ('add_class', 'add_property', 'modify_property', 'delete_property', 'delete_class')
 * @property {string} target - The target class or property name
 * @property {string} [schemaPath] - Path to the schema file for validation
 * @property {Object} [details] - Details of the change
 * @property {string} [schemaPath.ifNotExists] - Class name
 * @property {string} [details.description] - Description
 * @property {string} [details.type] - Type for properties
 * @property {string} [details.range] - Range for properties
 * @property {boolean} [details.required] - Whether required
 * @property {boolean} [details.multivalued] - Whether multivalued
 * @property {Object} [conditions] - Conditional behavior
 * @property {'skip'|'fail'|'overwrite'} [conditions.ifExists] - If target exists
 * @property {'create'|'fail'} [conditions.ifNotExists] - If target doesn't exist
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} success - Whether validation succeeded
 * @property {string} [error] - Error message if validation failed
 */

const SchemaChangeRequestSchema = z.object({
  action: z.enum(['add_class', 'add_property', 'modify_property', 'delete_property', 'delete_class']),
  target: z.string(),
  schemaPath: z.string().optional(),
  details: z.object({
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    range: z.string().optional(),
    required: z.boolean().optional(),
    multivalued: z.boolean().optional(),
  }).optional(),
  conditions: z.object({
    ifExists: z.enum(['skip', 'fail', 'overwrite']).optional(),
    ifNotExists: z.enum(['create', 'fail']).optional(),
  }).optional(),
});

/**
 * Validates a SchemaChangeRequest with comprehensive checks
 * Implemented as per T01 in M005/S03
 * @param {SchemaChangeRequest} request - The change request to validate
 * @returns {ValidationResult} - Validation result
 */
export async function validateSchemaChangeRequest(request) {
  try {
    // First, validate structure with Zod
    const validatedRequest = SchemaChangeRequestSchema.parse(request);

    // Check schema file existence if path provided
    if (validatedRequest.schemaPath) {
      const fs = await import('fs');
      if (!fs.existsSync(validatedRequest.schemaPath)) {
        return { success: false, error: `Schema file does not exist: ${validatedRequest.schemaPath}` };
      }
    }

    // Load schema for structural and constraint validation
    let schema = null;
    if (validatedRequest.schemaPath) {
      const agent = new LinkMLAgent();
      await agent.loadSchema(validatedRequest.schemaPath);
      schema = agent.schema;
    }

    // Perform LinkML-specific validations
    const constraintError = validateConstraints(validatedRequest, schema);
    if (constraintError) {
      console.error('Schema change validation failed:', { request: validatedRequest, error: constraintError });
      return { success: false, error: constraintError };
    }

    return { success: true };
  } catch (error) {
    console.error('Schema change validation error:', error);
    return { success: false, error: `Validation error: ${error.message}` };
  }
}

/**
 * Validates LinkML constraints for the change request
 * @param {Object} request - Validated change request
 * @param {Object} schema - Loaded schema
 * @returns {string|null} - Error message or null if valid
 */
function validateConstraints(request, schema) {
  switch (request.action) {
    case 'add_property':
    case 'modify_property':
      if (request.details?.range && schema) {
        // Check if type/range exists in schema
        if (!isValidType(schema, request.details.range)) {
          return `Invalid type/range '${request.details.range}': not defined in schema`;
        }
      }
      break;

    case 'delete_property':
      if (schema && request.target && request.details?.name) {
        const classDef = schema.classes?.[request.target];
        if (!classDef) {
          return `Class '${request.target}' not found in schema`;
        }
        const prop = classDef.slots?.[request.details.name];
        if (!prop) {
          return `Property '${request.details.name}' not found on class '${request.target}'`;
        }
        // Check if property is required
        if (prop.required) {
          return `Cannot delete required property '${request.details.name}' from class '${request.target}'`;
        }
      }
      break;

    case 'delete_class':
      if (schema && request.target) {
        if (!schema.classes?.[request.target]) {
          return `Class '${request.target}' not found in schema`;
        }
        // Basic check - could extend to check references but that's complex
      }
      break;

    default:
      // Other actions have basic structural validation from Zod
      break;
  }
  return null;
}

/**
 * Checks if a type/range is valid in the schema
 * @param {Object} schema - Loaded schema
 * @param {string} typeName - Type name to check
 * @returns {boolean} - Whether the type is valid
 */
function isValidType(schema, typeName) {
  // Check built-in types (datatypes)
  const builtinTypes = ['string', 'integer', 'boolean', 'float', 'double', 'decimal', 'uri', 'date', 'datetime'];
  if (builtinTypes.includes(typeName.toLowerCase())) {
    return true;
  }

  // Check custom classes
  if (schema.classes && schema.classes[typeName]) {
    return true;
  }

  // Check custom types if defined
  if (schema.types && schema.types[typeName]) {
    return true;
  }

  return false;
}

export class LinkMLAgent {
  constructor() {
    this.schema = null;
  }

  /**
   * Load a LinkML schema from YAML file
   */
  async loadSchema(filePath) {
    try {
      this.schema = await loadSchema(filePath);
      return true;
    } catch (error) {
      throw new Error(`Failed to load schema: ${error.message}`);
    }
  }

  /**
   * Load a LinkML schema from YAML string
   */
  loadSchemaFromString(yamlContent) {
    try {
      this.schema = loadSchema({ content: yamlContent });
      return true;
    } catch (error) {
      throw new Error(`Failed to load schema from string: ${error.message}`);
    }
  }

  /**
   * Validate a SchemaChangeRequest object
   */
  validateChangeRequest(request) {
    try {
      const validated = SchemaChangeRequestSchema.parse(request);
      return { success: true, data: validated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply a validated change request to the current schema
   */
  applyChangeRequest(changeRequest) {
    if (!this.schema) {
      throw new Error('No schema loaded. Call loadSchema() first.');
    }

    const validated = this.validateChangeRequest(changeRequest);
    if (!validated.success) {
      throw new Error(`Invalid change request: ${validated.error}`);
    }

    const req = validated.data;

    switch (req.action) {
      case 'add_class':
        this._addClass(req);
        break;
      case 'add_property':
        this._addProperty(req);
        break;
      case 'modify_property':
        this._modifyProperty(req);
        break;
      case 'delete_property':
        this._deleteProperty(req);
        break;
      case 'delete_class':
        this._deleteClass(req);
        break;
      default:
        throw new Error(`Unsupported action: ${req.action}`);
    }

    return this.schema;
  }

  /**
   * Export the current schema as YAML string
   */
  exportSchemaAsYaml() {
    if (!this.schema) {
      throw new Error('No schema loaded. Call loadSchema() first.');
    }
    // Using the schema's toString method or serialize functionality
    return this.schema.toYAML ? this.schema.toYAML() : this.schema.toString();
  }

  // Private helper methods for schema modifications

  _addClass(req) {
    const className = req.details?.name;
    if (!className) {
      throw new Error('Class name required for add_class action');
    }

    // Check if class already exists
    if (this.schema.classes && this.schema.classes[className]) {
      if (req.conditions?.ifExists === 'skip') return;
      if (req.conditions?.ifExists === 'fail') {
        throw new Error(`Class "${className}" already exists`);
      }
    }

    // Create new class
    if (!this.schema.classes) this.schema.classes = {};
    this.schema.classes[className] = {
      description: req.details?.description || '',
      slots: {},
      ...req.details
    };
  }

  _addProperty(req) {
    const { target: className, details } = req;
    if (!details?.name || !details?.type) {
      throw new Error('Property name and type required for add_property action');
    }

    const classDef = this._getClass(className);
    if (!classDef.slots) classDef.slots = {};

    // Check if property already exists
    if (classDef.slots[details.name]) {
      if (req.conditions?.ifExists === 'skip') return;
      if (req.conditions?.ifExists === 'fail') {
        throw new Error(`Property "${details.name}" already exists on class "${className}"`);
      }
    }

    classDef.slots[details.name] = {
      range: details.type,
      description: details.description || '',
      required: details.required || false,
      multivalued: details.multivalued || false,
      ...details
    };
  }

  _modifyProperty(req) {
    const { target: className, details } = req;
    if (!details?.name) {
      throw new Error('Property name required for modify_property action');
    }

    const classDef = this._getClass(className);
    if (!classDef.slots || !classDef.slots[details.name]) {
      if (req.conditions?.ifNotExists === 'create') {
        this._addProperty(req);
        return;
      } else {
        throw new Error(`Property "${details.name}" not found on class "${className}"`);
      }
    }

    const prop = classDef.slots[details.name];
    if (details.type) prop.range = details.type;
    if (details.description !== undefined) prop.description = details.description;
    if (details.required !== undefined) prop.required = details.required;
    if (details.multivalued !== undefined) prop.multivalued = details.multivalued;
  }

  _deleteProperty(req) {
    const { target: className, details } = req;
    if (!details?.name) {
      throw new Error('Property name required for delete_property action');
    }

    const classDef = this._getClass(className);
    if (!classDef.slots || !classDef.slots[details.name]) {
      if (req.conditions?.ifNotExists === 'fail') {
        throw new Error(`Property "${details.name}" not found on class "${className}"`);
      }
      return; // Already absent
    }

    delete classDef.slots[details.name];
  }

  _deleteClass(req) {
    const className = req.target;
    if (!this.schema.classes || !this.schema.classes[className]) {
      if (req.conditions?.ifNotExists === 'fail') {
        throw new Error(`Class "${className}" not found`);
      }
      return; // Already absent
    }

    delete this.schema.classes[className];
  }

  _getClass(className) {
    if (!this.schema.classes || !this.schema.classes[className]) {
      throw new Error(`Class "${className}" not found in schema`);
    }
    return this.schema.classes[className];
  }
}

/**
 * Convenience function to process a single change request
 */
export async function processSchemaChange(schemaPath, changeRequest) {
  const agent = new LinkMLAgent();
  await agent.loadSchema(schemaPath);

  const modifiedSchema = agent.applyChangeRequest(changeRequest);
  return agent.exportSchemaAsYaml();
}