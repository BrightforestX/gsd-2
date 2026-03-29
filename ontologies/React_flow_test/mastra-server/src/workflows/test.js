// Simple test for the SchemaUpdateStep
import * as fs from "fs";
import { SchemaUpdateStep } from "./schemaUpdateStep.js";

// Create a simple test YAML file
const testFilePath = "./test-schema.yaml";
const initialSchema = {
  version: "1.0",
  classes: {},
  slots: {}
};

fs.writeFileSync(testFilePath, JSON.stringify(initialSchema, null, 2));

// Test the step
const step = new SchemaUpdateStep();
const input = {
  filePath: testFilePath,
  updates: {
    version: "1.1",
    classes: {
      "Person": {
        description: "A person"
      }
    }
  }
};

try {
  const result = await step.execute(input);
  console.log("Test result:", result);

  if (result.success) {
    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    console.log("Updated schema:");
    console.log(updatedContent);
  }
} catch (error) {
  console.error("Test failed:", error);
} finally {
  fs.unlinkSync(testFilePath);
}