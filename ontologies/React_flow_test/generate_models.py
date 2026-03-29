#!/usr/bin/env python3
"""
Optimized LinkML Pydantic Model Generator

Generates Pydantic models from root LinkML schema (app.yaml) which handles
imports automatically. Run whenever schemas change.

Usage:
    python generate_models.py

This ensures stable model names that never break your FastMCP tools.
"""

import subprocess
import sys
from pathlib import Path

# Define paths (adjust if needed for your setup)
PROJECT_ROOT = Path(__file__).parent
SCHEMAS_DIR = PROJECT_ROOT / "schemas"
OUTPUT_FILE = PROJECT_ROOT / "python_schema_outputs" / "validation-test-models.py"

def regenerate_models():
    """
    Regenerate Pydantic models from LinkML schema.

    Always generates from 'app.yaml' as it's the root schema with imports.
    This ensures all classes (core + app) are merged into one output file.

    Model class names match the keys in your LinkML YAML classes: section,
    so they remain stable across regenerations.
    """

    # Create generated directory if it doesn't exist
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Generate from root schema (app.yaml) - this imports core.yaml automatically
    schema_file = SCHEMAS_DIR / "app.yaml"

    if not schema_file.exists():
        print(f"❌ Error: Schema file not found: {schema_file}")
        print("Make sure schemas/app.yaml exists with proper imports.")
        sys.exit(1)

    try:
        print(f"🔄 Generating Pydantic models from {schema_file.name}...")

        # Prefer `linkml generate pydantic` (matches gsd-capabilities-py / LinkML 1.8+)
        result = subprocess.run(
            [
                "linkml",
                "generate",
                "pydantic",
                str(schema_file),
                "--no-metadata",
            ],
            check=False,
            capture_output=True,
            text=True,
            cwd=str(SCHEMAS_DIR),
        )

        if result.returncode != 0:
            print(f"❌ Generation failed:")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            sys.exit(1)

        OUTPUT_FILE.write_text(result.stdout, encoding="utf-8")
        print(f"✅ Pydantic models regenerated → {OUTPUT_FILE}")
        print(f"   Models include: All classes from {schema_file.name} + imported schemas")
        print(f"   Class names are stable and match your YAML keys")

        # Show generated classes for verification
        try:
            with open(OUTPUT_FILE, 'r') as f:
                content = f.read()
                # Extract class definitions (basic regex - for reference only)
                lines = content.split('\n')
                classes_found = [line.split('class ')[1].split('(')[0]
                               for line in lines if line.strip().startswith('class ')]
                if classes_found:
                    print(f"   Generated classes: {', '.join(classes_found)}")
        except Exception as e:
            print(f"   (Could not parse generated classes: {e})")

    except FileNotFoundError:
        print("❌ Error: linkml CLI not found.")
        print("Install with: pip install linkml")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"❌ Generation process failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    regenerate_models()