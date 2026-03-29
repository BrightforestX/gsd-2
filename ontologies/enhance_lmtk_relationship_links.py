#!/usr/bin/env python3
"""
Post-process HTML from `lmtk visualize` to add in-page links for schema relationships.

lmtk does not expose a CLI flag for this; cards already use ids like #classes-Capability
(see linkml_toolkit visualization/core.py). This script linkifies plain references in
detail panels to match those anchors.

Usage:
  python3 ontologies/enhance_lmtk_relationship_links.py \\
    ontologies/gsd-capabilities.linkml.yaml \\
    ontologies/gsd-capabilities-visualization.html
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from linkml_runtime.utils.schemaview import SchemaView

LINK_CLASS = 'class="text-blue-600 hover:underline font-medium"'

# lmtk uses section ids: classes, slots, enums, types (see _generate_sidebar_links).
def _href(kind: str, name: str) -> str:
    return f'#{kind}-{name}'


def _link(kind: str, name: str) -> str:
    return f'<a {LINK_CLASS} href="{_href(kind, name)}">{name}</a>'


def _linkify_list(content: str, classes: set[str]) -> str:
    parts = [p.strip() for p in content.split(",")]
    out = []
    for p in parts:
        if not p:
            continue
        if p in classes:
            out.append(_link("classes", p))
        else:
            out.append(p)
    return ", ".join(out)


def enhance(html: str, sv: SchemaView) -> str:
    classes = set(sv.all_classes())
    enums = set(sv.all_enums())
    slots = set(sv.all_slots())
    types = set(sv.all_types())

    def repl_inherits(m: re.Match[str]) -> str:
        pre, name, post = m.group(1), m.group(2), m.group(3)
        if name in classes:
            return f"{pre}{_link('classes', name)}{post}"
        return m.group(0)

    html = re.sub(
        r'(<dt class="text-sm font-medium text-gray-600">Inherits from</dt>'
        r'<dd class="text-sm text-gray-800 ml-4">)([A-Za-z][A-Za-z0-9_]*)(</dd>)',
        repl_inherits,
        html,
    )

    def repl_mixins(m: re.Match[str]) -> str:
        pre, inner, post = m.group(1), m.group(2), m.group(3)
        return pre + _linkify_list(inner, classes) + post

    html = re.sub(
        r'(<dt class="text-sm font-medium text-gray-600">Mixins</dt>'
        r'<dd class="text-sm text-gray-800 ml-4">)([^<]+)(</dd>)',
        repl_mixins,
        html,
    )

    def repl_range_dd(m: re.Match[str]) -> str:
        pre, name, post = m.group(1), m.group(2), m.group(3)
        if name in classes:
            return f"{pre}{_link('classes', name)}{post}"
        if name in enums:
            return f"{pre}{_link('enums', name)}{post}"
        if name in slots:
            return f"{pre}{_link('slots', name)}{post}"
        if name in types:
            return f"{pre}{_link('types', name)}{post}"
        return m.group(0)

    html = re.sub(
        r'(<dt class="text-sm font-medium text-gray-600">Range</dt>'
        r'<dd class="text-sm text-gray-800 ml-4">)([A-Za-z][A-Za-z0-9_]*)(</dd>)',
        repl_range_dd,
        html,
    )

    def repl_code(m: re.Match[str]) -> str:
        name = m.group(1)
        if name in classes:
            return (
                f'<a href="{_href("classes", name)}">'
                f'<code class="px-2 py-1 bg-gray-100 rounded text-sm text-blue-800">{name}</code></a>'
            )
        if name in enums:
            return (
                f'<a href="{_href("enums", name)}">'
                f'<code class="px-2 py-1 bg-gray-100 rounded text-sm text-blue-800">{name}</code></a>'
            )
        if name in slots:
            return (
                f'<a href="{_href("slots", name)}">'
                f'<code class="px-2 py-1 bg-gray-100 rounded text-sm text-blue-800">{name}</code></a>'
            )
        return m.group(0)

    html = re.sub(
        r'<code class="px-2 py-1 bg-gray-100 rounded text-sm">([A-Za-z][A-Za-z0-9_]*)</code>',
        repl_code,
        html,
    )

    def repl_enum_badge(m: re.Match[str]) -> str:
        name = m.group(1)
        if name not in enums:
            return m.group(0)
        return (
            f'<a {LINK_CLASS} href="{_href("enums", name)}">'
            f'<code class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">Enum: {name}</code>'
            f"</a>"
        )

    html = re.sub(
        r'<code class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">Enum: ([A-Za-z][A-Za-z0-9_]*)</code>',
        repl_enum_badge,
        html,
    )

    return html


def main() -> None:
    if len(sys.argv) != 3:
        print(
            "Usage: enhance_lmtk_relationship_links.py <schema.yaml> <visualization.html>",
            file=sys.stderr,
        )
        sys.exit(2)
    schema_path = Path(sys.argv[1])
    html_path = Path(sys.argv[2])
    sv = SchemaView(str(schema_path))
    text = html_path.read_text(encoding="utf-8")
    out = enhance(text, sv)
    html_path.write_text(out, encoding="utf-8")
    print(f"Updated {html_path} with relationship links.")


if __name__ == "__main__":
    main()
