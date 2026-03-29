#!/usr/bin/env python3
"""
Run lmtk-style full documentation export.

Upstream linkml-toolkit calls SchemaVisualizer._save_hierarchy_diagram and
_generate_element_docs but does not implement them (see genomewalker/linkml-toolkit).
This script patches those methods, then runs generate_documentation.

Usage:
  python3 ontologies/run_lmtk_full_docs.py <schema.yaml> <output_dir>
"""

from __future__ import annotations

import sys
from pathlib import Path

from linkml_toolkit.core import LinkMLProcessor
from linkml_toolkit.visualization.core import SchemaVisualizer, VisualizationConfig


def _patch_schema_visualizer() -> None:
    def _save_hierarchy_diagram(self: SchemaVisualizer, output_path: Path) -> None:
        content = self._generate_hierarchy_section()
        title = f"{self.viz_data['metadata'].get('name', 'Schema')} — hierarchy"
        html_content = self._create_base_template(title=title, content=content)
        self._save_html(html_content, output_path)

    def _generate_element_docs(self: SchemaVisualizer, output_path: Path) -> None:
        """One HTML page per schema element (mirrors intended lmtk --full-docs behavior)."""
        for section_name, items in self.viz_data["structure"].items():
            if not items:
                continue
            subdir = output_path / section_name
            subdir.mkdir(parents=True, exist_ok=True)
            for name, info in sorted(items.items()):
                card = self._generate_element_card(name, info, section_name)
                nav = (
                    '<div class="mb-6 p-4 bg-gray-50 rounded-lg">'
                    '<a href="../visualization.html" class="text-blue-600 hover:underline">'
                    "← Main visualization</a>"
                    f' · <a href="../hierarchy.html" class="text-blue-600 hover:underline">'
                    "Hierarchy</a>"
                    "</div>"
                )
                body = f'<div class="max-w-4xl mx-auto p-8">{nav}{card}</div>'
                title = f"{name} — {section_name}"
                page = self._create_base_template(title=title, content=body)
                safe = name.replace("/", "_")
                (subdir / f"{safe}.html").write_text(page, encoding="utf-8")

    SchemaVisualizer._save_hierarchy_diagram = _save_hierarchy_diagram
    SchemaVisualizer._generate_element_docs = _generate_element_docs


def main() -> None:
    if len(sys.argv) != 3:
        print(
            "Usage: run_lmtk_full_docs.py <schema.yaml> <output_dir>",
            file=sys.stderr,
        )
        sys.exit(2)
    schema = Path(sys.argv[1])
    out = Path(sys.argv[2])
    _patch_schema_visualizer()
    processor = LinkMLProcessor(str(schema), validate=True, strict=False)
    visualizer = SchemaVisualizer(processor, config=VisualizationConfig())
    out.mkdir(parents=True, exist_ok=True)
    visualizer.generate_documentation(out)
    index = out / "index.html"
    index.write_text(
        '<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<meta http-equiv="refresh" content="0;url=visualization.html">'
        '<title>Redirect</title></head><body>'
        '<p><a href="visualization.html">Open visualization</a></p></body></html>',
        encoding="utf-8",
    )
    print(f"Wrote lmtk full-docs bundle to {out.resolve()}")


if __name__ == "__main__":
    main()
