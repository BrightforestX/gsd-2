#!/usr/bin/env node

/**
 * Workflow Test Validation Script for SchemaUpdateWorkflow
 * Creates sample schema change and validates workflow structure
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  throw new Error(message);
}

function validateWorkflowFile() {
  log('🔍 Validating SchemaUpdateWorkflow structure...', colors.bold);

  const workflowPath = join(__dirname, 'mastra-server', 'src', 'workflows', 'schemaUpdateWorkflow.ts');

  if (!existsSync(workflowPath)) {
    error('SchemaUpdateWorkflow file not found!');
  }

  const workflowContent = readFileSync(workflowPath, 'utf-8');

  // Check for required structure
  const requiredElements = [
    'import { Workflow } from \'@mastra/core\'',
    'export class SchemaUpdateWorkflow extends Workflow',
    'new SchemaAnalysisStep()',
    'new SchemaUpdateStep()',
    'new SchemaGenerationStep()'
  ];

  for (const element of requiredElements) {
    if (!workflowContent.includes(element)) {
      error(`Missing required element: ${element}`);
    }
  }

  log('✅ SchemaUpdateWorkflow structure validated', colors.green);
}

function validateSchemaFile() {
  log('🔍 Validating schema file structure...', colors.bold);

  const schemaPath = path.join(__dirname, 'schemas', 'app.yaml');

  if (!fs.existsSync(schemaPath)) {
    error('Schema file not found!');
  }

  try {
    const schemaContent = yaml.load(fs.readFileSync(schemaPath, 'utf-8'));

    // Check required structure
    if (!schemaContent.id || !schemaContent.name || !schemaContent.classes) {
      error('Schema file missing required properties');
    }

    log('✅ Schema file structure validated', colors.green);
  } catch (e) {
    error(`Invalid YAML in schema file: ${e.message}`);
  }
}

function createSampleSchemaChange() {
  log('🔍 Creating sample schema change file...', colors.bold);

  // Create a sample schema change with FlowNode and FlowEdge
  const sampleSchemaChange = {
    classes: [
      {
        name: 'FlowNode',
        description: 'A node in a React Flow diagram',
        slots: ['id', 'type', 'position', 'data']
      },
      {
        name: 'FlowEdge',
        description: 'An edge connecting nodes in a React Flow diagram',
        slots: ['id', 'source', 'target', 'type']
      }
    ],
    slots: [
      {
        name: 'id',
        description: 'Unique identifier',
        range: 'string'
      },
      {
        name: 'type',
        description: 'Type of node or edge',
        range: 'string'
      },
      {
        name: 'position',
        description: 'Position coordinates',
        range: 'object'
      },
      {
        name: 'data',
        description: 'Node data payload',
        range: 'object'
      },
      {
        name: 'source',
        description: 'Source node ID',
        range: 'string'
      },
      {
        name: 'target',
        description: 'Target node ID',
        range: 'string'
      }
    ]
  };

  const yamlOutput = YAML.dump(sampleSchemaChange);
  writeFileSync(join(__dirname, 'test-schema-change.yaml'), yamlOutput);

  log('✅ Sample schema change created: test-schema-change.yaml', colors.green);
}

function main() {
  try {
    log('🚀 Starting SchemaUpdateWorkflow validation...\n', colors.bold);

    validateWorkflowFile();
    console.log();

    validateSchemaFile();
    console.log();

    createSampleSchemaChange();
    console.log();

    log('🎉 All validation checks passed!', colors.green);
    log('Workflow test script executed successfully', colors.green);

  } catch (e) {
    log(`❌ Validation failed: ${e.message}`, colors.red);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateWorkflowFile, validateSchemaFile, createSampleSchemaChange };