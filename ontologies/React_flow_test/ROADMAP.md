# React_flow_test — product roadmap

Engineering plan for the Vite + `@xyflow/react` schema editor and LinkML tooling under `ontologies/React_flow_test`. Items are ordered roughly by dependency (foundations before AI), but parallel work is possible where noted.

The numbered sections **§1–§5** below are **this repo’s near-term delivery plan**. The following two sections are a **north-star / consensus reference** for what a full ontology editor can entail, and how Palantir structures operational ontologies—useful when prioritizing features and UX patterns.

---

## Engineering approach: hypotheses, metrics, and falsification

Treat each epic as a **bet**, not a commitment. A senior delivery pattern:

1. **State a hypothesis** — One sentence: what user or system behavior will improve, and why this shape of solution is likely to work.  
2. **Define falsifiers** — Observable signals that prove the approach *wrong* or *too expensive* (latency, bug rate, user drop-off, maintenance cost).  
3. **Instrument before scaling** — Minimal telemetry or counters (even dev-only) for critical paths: canvas switch time, SSE reconnect rate, layout failures, copilot apply success/fail, E2B sandbox start/destroy latency and failure rate.  
4. **Time-box spikes** — Unknowns (ELK at N nodes, CopilotKit bundle size, multi-tab memory, E2B cold start vs warm pool) get a calendar-bound spike with a written outcome: proceed, pivot, or defer.  
5. **Definition of Done includes tests** — See **Testing strategy** below; merging without the agreed test tier for that change is technical debt by default.

**Quality bar (default):** pure logic and parsers → **unit + property tests** where cheap; boundaries (HTTP, FS, browser APIs) → **integration**; user journeys → **BDD + E2E** (thin slice, not every permutation).

---

## Hypotheses & falsification criteria (by epic)

| Epic | Hypothesis (if true, we win) | Falsifiers (signals to stop or redesign) | Leading metrics |
|------|------------------------------|-------------------------------------------|-----------------|
| **§1 Multi-canvas** | Users need side-by-side schemas more than a single mega-graph; tabbed state is understandable and restorable. | Restore loses data; tab switch > perceptible threshold (e.g. consistently >200ms with modest graphs); users confuse “which file is bound to which tab.” | Tab switch p95, restore error rate, support issues / UX study notes. |
| **§2 Palantir-like UI** | Token-driven dark UI improves scanability and perceived quality without slowing iteration. | WCAG regressions; designers/devs bypass tokens (entropy of one-off colors grows); bundle/CSS cost spikes. | Token coverage %, a11y lint in CI, design review checklist pass rate. |
| **§3 React Flow depth** | Exposing more RF features increases usefulness as a reference app without destabilizing instance + LinkML modes. | Bug count rises in `onConnect`/viewport; E2E flaky; bundle size grows disproportionately to adoption. | RF-related defects per release, E2E stability, optional feature usage (if instrumented). |
| **§4 Mastra + CopilotKit** | Assisted edits reduce time to safe YAML changes when guarded by preview + parse validation. | Users apply broken YAML; latency unacceptable; cost per session too high; security incident on path traversal. | Apply success rate, parse failure after apply, time-to-first-good-edit, tool-call volume. |
| **§5 E2B sandbox edits** | Running agents/tools that **mutate files or run commands** inside an [E2B](https://e2b.dev) sandbox contains blast radius vs local dev middleware; users still get preview/merge to the real repo. | Sandbox cost per edit exceeds budget; cold start kills UX; sync drift between sandbox FS and host; secrets leak into sandbox templates. | Sandbox session duration, edits committed vs discarded, cost per successful merge, incident count. |
| **Ontology north-star** | Mapping long-term features to epics avoids scope creep in §1–§5. | Roadmap becomes wishlist with no cuts; no quarterly “not now” decisions documented. | % of north-star items with explicit defer reason + revisit date. |

Document **spike outcomes** and **rejected alternatives** in PR descriptions or `docs/decisions/` when non-obvious.

---

## Testing strategy: unit · integration · BDD · E2E

### Pyramid and ownership

```
        ┌─────────┐
        │   E2E   │  few, slow, brittle surface — critical journeys only
        ├─────────┤
        │   BDD   │  human-readable behavior contract; drives acceptance
        ├─────────┤
        │  Integ. │  HTTP + Vite plugin, FS allowlist, React boundaries
        ├─────────┤
        │  Unit   │  parsers, layout inputs, reducers, pure transforms
        └─────────┘
```

- **Unit:** Fast, deterministic, no network; run on every commit.  
- **Integration:** Real `fetch` to dev middleware, or Node harness hitting plugin logic; may run in CI with `vite`/`node` test runner.  
- **BDD:** Gherkin (or similar) features live **beside** code—e.g. `ontologies/React_flow_test/tests/bdd/features/` and `steps/`—and assert outcomes, not implementation CSS selectors where avoidable.  
- **E2E:** One browser driver (recommend **Playwright** for speed + trace); target **smoke + P0 journeys**; parallelize in CI.

### Unit tests (what to cover)

| Area | Examples | Notes |
|------|----------|--------|
| **LinkML → graph** | `linkmlYamlToFlow`: class/enum nodes, `is_a`, mixin, slot edges, domain slots; malformed YAML; empty `classes` | Golden fixtures from `gsd-capabilities.linkml.yaml` snapshots; property-based optional (random DAGs within constraints). |
| **URLs / config** | `getGsdLinkmlStreamUrl` with mocked `import.meta.env.BASE_URL` | Keep base-path regression-proof. |
| **State helpers** | `snapshotGraph`, canvas reducer (when §1 exists), path normalization for allowlist | Pure functions only. |
| **Schema/instance** | Existing `schemaUtils` / loaders | Extend as new slot types or LinkML shapes appear. |

### Integration tests (boundaries)

| Boundary | Examples |
|----------|----------|
| **Vite plugin / SSE** | Start server (or import middleware handler), connect, receive `data:` frames; debounce does not drop final payload; cleanup on client disconnect. |
| **Parameterized LinkML path (§1c)** | Request with allowed vs rejected path; assert 403/400 on traversal. |
| **ELK layout** | Given fixed nodes/edges, positions are finite and stable across runs (same seed/options). |
| **Copilot apply API (§4)** | POST patch → file content + `mtime`; reject invalid YAML; reject out-of-allowlist paths. |

Run integration in CI with **fixed ports** and **temp dirs**; no reliance on developer’s home directory.

### BDD (behavior-driven acceptance)

**Conventions**

- **Feature files** describe *what* users/observers see; **step definitions** call app APIs, Playwright, or harnesses—not React internals.  
- Tag scenarios: `@smoke`, `@linkml`, `@multi-canvas`, `@copilot`, `@a11y`.  
- Prefer **declarative steps**: “the LinkML canvas shows class `Capability`” vs “node id `class:Capability` exists.”

**Starter scenarios (illustrative)**

- `@linkml @smoke` — Toggle LinkML mode → graph contains expected class count; stream updates after external file touch (integration + E2E hook).  
- `@instance` — Load sample JSON → layout completes → export YAML round-trips within tolerance.  
- `@multi-canvas` (§1) — Create second canvas → edit A → switch to B → A unchanged → restore after reload.  
- `@copilot` (§4) — Propose patch → preview visible → reject leaves disk unchanged; accept with valid YAML updates file and canvas.  
- `@a11y` — Focus order reaches primary actions; graph region has accessible name where applicable.

Align BDD tags with **CI shards** so smoke runs on every PR, heavy flows nightly.

### E2E tests (browser)

| Journey | Preconditions | Assertions |
|---------|---------------|------------|
| **Cold start** | `npm run dev` (or preview + test server) | Welcome → dismiss → instance canvas visible. |
| **LinkML mode** | Dev server + writable fixture YAML | Toggle LinkML; ≥1 node; save file; graph updates within timeout. |
| **Regression: instance connect** | Chemdcat schema | Valid connection succeeds; invalid blocked (existing behavior). |
| **§1 (when shipped)** | Two tabs | Independent positions/selection; no cross-tab bleed. |
| **§4 (when shipped)** | Mock or stub LLM for deterministic tool calls | Full apply/reject flows without flaky model output. |

**Flake policy:** retries only for known infra issues; root-cause any test that needs >1 retry. Use **tracing** (`trace on first retry`) in CI artifacts.

### CI gates (recommended)

| Gate | Scope |
|------|--------|
| **PR** | `lint` + **unit** + **smoke BDD** (or subset) + **1–3 E2E** against `vite preview` or dev harness. |
| **Main / nightly** | Full **integration** + **E2E** matrix (Chromium minimum; optional WebKit). |
| **Release** | Manual or scripted **a11y** spot-check + changelog links to test report. |

### Test data and fixtures

- **Golden LinkML:** Trimmed copies under `tests/fixtures/linkml/` (avoid copying entire repo ontology unless needed).  
- **Secrets:** No API keys in fixtures; Mastra/Copilot tests use mocks or recorded **VCR-style** responses if legal.  
- **Determinism:** Pin layout options in tests; avoid wall-clock unless fake timers.

### Non-goals (explicit)

- **100% E2E coverage** of React Flow gestures—use unit/integration for math and graph transforms.  
- **BDD for every prop**—UI components stay at RTL/Vitest unless behavior is user-contractual.  
- **Running HermiT/Pellet** in this app’s default CI (ontology vision)—until an epic owns reasoning; until then, document as out of scope.

---

## Ontology editor vision (industry consensus)

An **ontology editor** (whether for formal semantic-web ontologies like OWL/RDF or operational/business ontologies) should provide a comprehensive, user-friendly environment for **modeling, validating, visualizing, and maintaining** structured knowledge. The exact feature set depends on the use case (academic/research vs enterprise/operational), but here is a **consensus list of essential / must-have features** drawn from mature tools like Protégé, WebProtégé, TopBraid EDG, and others:

### Core modeling & editing

- **Class / object type hierarchy** — Tree or graph view for creating, editing, and navigating inheritance (`is_a`, mixins, interfaces).
- **Properties / slots / attributes** — Rich type support (strings, numbers, dates, geospatial, time-series, media, etc.), cardinality, domains/ranges, and annotations.
- **Relationships / links** — Define directed links between classes with cardinality, inverse properties, and metadata.
- **Individuals / instances** — Create, edit, and bulk-manage concrete instances.
- **Constraints & validation** — SHACL, OWL reasoning, or custom rules for consistency checks, satisfiability, and quality enforcement.

### Visualization & navigation

- **Hierarchical + graph views** — Collapsible trees, force-directed graphs, ER diagrams, or custom layouts.
- **Search & discovery** — Full-text search, faceted browsing, and “discover” dashboards.

### Advanced & operational features

- **Reasoning / inference** — Integrated reasoners (HermiT, Pellet, etc.) for automatic classification and inconsistency detection.
- **Versioning & branching** — Git-like branching, proposals/PRs, change tracking, and rollback.
- **Data mapping & backing** — Connect ontology elements to external data sources (databases, CSVs, models, pipelines) with live syncing.
- **Actions / write-back / functions** — Define operations that change data (especially important in operational ontologies).
- **Collaboration & governance** — Multi-user editing, threaded comments, access controls, maturity levels, audit logs, and approval workflows.
- **Import / export / standards** — Full OWL, RDF, Turtle, JSON-LD, SHACL, etc. support + API access.
- **Extensibility** — Plugins, custom forms, scripting (Python/JS), and APIs.
- **Observability & analytics** — Usage metrics, impact analysis (“what breaks if I change this?”), and performance monitoring.

### Nice-to-haves

- Natural-language editing interfaces  
- AI-assisted modeling  
- Real-time collaboration  
- Embedded query builders (SPARQL / GraphQL)  

These capabilities move an editor toward **production-ready** tooling rather than “just a schema drawer.”

---

## Palantir’s ontology editor & visualizer (2026 reference)

Palantir **does not** use a traditional OWL-style editor. Instead it provides an **operational ontology** (a live digital twin of the business) inside Foundry. The primary **editor** is **Ontology Manager** (sometimes referred to as the Ontology Management Application or OMA). There is **no single dedicated “Ontology Visualizer” app**; visualization is integrated across multiple Foundry tools (Object Explorer, Vertex, Map, Object Views, Quiver, etc.).

### Ontology Manager (the editor) — key features

- **Object types** — Create/edit real-world entities with rich metadata, primary keys, and interfaces (polymorphism).
- **Properties** — Support for normal, time-series, geospatial, and media properties.
- **Link types** — Define relationships; includes a built-in **link-type graph** visualization on the object-type Overview page.
- **Action types** — Define “kinetic” operations (how users or systems create/edit/delete objects or trigger external changes).
- **Functions** — Author business logic (TypeScript/Python) for derived values, edits, or workflows; includes version history and observability.
- **Data mapping & backing** — Connect object types to datasets, virtual tables, or models with live pipelines.
- **Branching & versioning** — Global branching + proposal-based workflows (similar to Git PRs); function versioning with upgrade paths.
- **Discover view** — Customizable landing page with favorites, recently viewed items, groups, and usage stats.
- **Observability** — Near real-time usage metrics (e.g. 30-day history), monitoring rules, and impact analysis per resource.
- **UI layout** — Top bar (global search, create, branch navigation), sidebar, Object-type Overview (metadata, properties, actions, link graph, dependents, data, usage), dedicated property/link/action/function editors.
- **Export/import** — Full ontology JSON export (including mappings); advanced section for bulk operations.
- **Governance** — Granular permissions, maturity levels, and security on elements.

### Ontology visualization in Palantir (no single “Visualizer” app)

- **Link type graph** (inside Ontology Manager) — Graph of relationships for a given object type.
- **Object Explorer** — Search, browse, filter, and drill into live objects and their links.
- **Vertex** — Advanced graph visualization and cause-and-effect analysis across the digital twin.
- **Map** — Geospatial visualization (points, clusters, tracks, heatmaps) for objects with location properties.
- **Object Views / Workshop** — Custom dashboards and forms combining tables, charts, timelines, and embedded visualizations.
- **Quiver / Contour** — Analytical charting and time-series visualization of ontology data.

*Use this section as a **pattern library**, not an implementation spec—Foundry is a separate product; this app targets LinkML + JSON Schema workflows with Palantir-*like* density and affordances where appropriate (see §2).*

---

## 1. Multiple schema files on different canvases

**Goal:** Let users work with more than one schema or LinkML source at a time, each with its own graph state, without losing the instance-editor workflow.

### Phases

| Phase | Scope | Notes |
|--------|--------|--------|
| **1a — Document model** | Define a **canvas** (or **workspace tab**) entity: `id`, `label`, `kind` (`instance` \| `linkml-schema`), optional `filePath` / `schemaUri`, serialized `nodes`/`edges`, viewport, and timestamps. | Persist to `localStorage` first; optional later sync (file, backend). |
| **1b — UI shell** | Tab strip or sidebar list of canvases; **New canvas** / **Duplicate** / **Close**; keyboard shortcut to switch tabs. | Avoid blocking the main thread with huge graphs when switching (lazy mount or keep last N in memory). |
| **1c — LinkML per canvas** | Allow each LinkML-mode canvas to bind to a **different YAML path** (env, picker, or server config list). Extend or compose the Vite plugin / API so the stream or snapshot is **parameterized** (e.g. `?path=` or route per file), with safe path allowlisting. | Today a single file is hard-wired to `gsd-capabilities.linkml.yaml`. |
| **1d — Instance schema variants** | Align with existing `VITE_SCHEMA` builds: either one dev server per variant or runtime-loaded configs so an “instance” canvas can target chemdcat vs dcat-ap-plus without rebuilding. | Builds may stay split; dev can unify behind dynamic import. |

### Acceptance criteria (summary)

- User can open ≥2 canvases, switch between them, and see independent node/edge state.
- LinkML streams (or loads) can target different files per canvas where the server allows.
- Closing the app and reopening restores tabs (if persistence is in scope for the phase).

### Testing hooks (§1)

- **Unit:** Serialization round-trip of canvas document; migration of older persisted shape.  
- **Integration:** Allowlisted path resolution; SSE/query param for file id.  
- **BDD:** Multi-canvas isolation scenarios; persistence after reload.  
- **E2E:** Tab create/switch/close; optional second browser context *not* required unless collaboration ships.

---

## 2. Palantir-style visual language

**Goal:** Continue aligning the UI with a **Palantir-like** dense, dark, data-workbench aesthetic (not a pixel-perfect clone—respect IP and brand).

### Workstreams

- **Tokens & surfaces:** Extend `src/theme/palantir.css` and shared CSS variables for elevation, borders, typography scale, and focus rings. Audit `NodePalette`, `SchemaNode`, LinkML nodes, modals, and `WelcomeScreen` for consistency.
- **Components:** Standardize buttons, inputs, section headers, and empty states to the same token set; reduce one-off hex colors in favor of variables.
- **Data density:** Optional “compact” mode for schema cards and sidebar lists (line height, padding).
- **Motion:** Short, subtle transitions on panel collapse and focus changes; avoid distracting animation on the graph itself unless toggled.
- **Accessibility:** Contrast checks on graph edges and labels over dark backgrounds; visible focus for keyboard navigation.

### Acceptance criteria (summary)

- Style guide section in this repo (short doc or comment block in `palantir.css`) listing tokens and when to use them.
- No major screen regresses WCAG AA for text on default surfaces.

### Testing hooks (§2)

- **Unit:** N/A for pure CSS tokens; optional snapshot of computed variables in JSDOM if stable.  
- **Integration:** Visual regression optional (Percy/Chromatic)—policy decision; otherwise manual checklist per release.  
- **BDD:** `@a11y` flows—focus visible, landmark roles for sidebar/canvas.  
- **E2E:** Screenshot or axe-core subset on Welcome + LinkML banner + one modal.

---

## 3. Use the React Flow feature set comprehensively

**Goal:** Exercise **@xyflow/react** capabilities beyond the current subset so the app can serve as a reference for advanced graphs.

### Feature checklist (prioritize by value)

| Area | Feature | Status idea | Notes |
|------|---------|-------------|--------|
| **Viewport** | `Background` variants, `Controls`, `MiniMap` | Partially done | Add **zoom slider**, **fit selection**, **toggle interactivity** consistently across modes. |
| **Nodes** | Custom node types | Done (schema + LinkML) | Add **group / subflow** nodes if hierarchical bundles are needed. |
| **Nodes** | `NodeResizer`, `NodeToolbar` | Partial / optional | Useful for large schema cards or quick actions. |
| **Edges** | Multiple edge types (`default`, `smoothstep`, `step`, `bezier`), markers, labels | Partial | Expose edge type in settings; use markers for direction on LinkML edges. |
| **Interaction** | `SelectionMode`, multi-select, `onlyRenderVisibleElements` for large graphs | TBD | Enable when graph count grows. |
| **Helpers** | Snap grid (already configurable), connection radius, `ReconnectEdge` / edge editing | TBD | Improve ergonomics for instance editor. |
| **Panels** | `Panel` for persistent HUD (legend, filters, mini-toolbar) | TBD | Replace ad-hoc absolute banners where it fits. |
| **Hooks / state** | `useNodesState` / `useEdgesState`, `useReactFlow` | Mixed | Refactor hot paths for clarity; consider `Zustand` or context only if multi-canvas state requires it. |
| **Export** | `toSvg` / `toPng` (if available in version) or screenshot flow | TBD | For docs and reviews. |
| **Plugins** | `@xyflow/react` ecosystem (e.g. layout, minimap themes) | Evaluate | After lockfile and license review. |

### Process

1. Inventory current usage in `App.jsx`, `CanvasControls`, and node components.  
2. Gap-fill with a **“React Flow showcase”** dev route or settings panel that toggles optional features.  
3. Document supported features in `README.md` or a short `docs/react-flow-features.md`.

### Acceptance criteria (summary)

- Checklist above reviewed; high-value items implemented or explicitly deferred with reason.
- Instance and LinkML modes both behave correctly with global settings (edge type, minimap, etc.).

### Testing hooks (§3)

- **Unit:** Any new layout math or edge-type mappers.  
- **Integration:** React Flow `onNodesChange` batching with feature flags off/on.  
- **BDD:** “Given minimap closed, When user toggles, Then …” for contractual UX.  
- **E2E:** One scenario per **major** new control (e.g. fit selection)—avoid combinatorial explosion.

---

## 4. Mastra AI + CopilotKit: copilot that edits LinkML YAML

**Goal:** Add an **AI-assisted layer** (Mastra for agents/workflows, CopilotKit for in-app copilot UI) that can **read and propose edits** to LinkML YAML files (starting with `gsd-capabilities.linkml.yaml` and extending to multi-file in §1).

### Architecture (proposed)

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  React_flow_test    │────▶│  CopilotKit UI   │────▶│  Mastra backend         │
│  (Vite + React)     │     │  (sidebar / chat)│     │  (Node runtime / API)   │
└─────────┬───────────┘     └──────────────────┘     └───────────┬─────────────┘
          │                                                        │
          │  SSE / REST file access                                │
          ▼                                                        ▼
┌─────────────────────┐                              ┌─────────────────────────┐
│  Vite middleware or │                              │  Tools: read_yaml,      │
│  small API server   │                              │  propose_patch, apply   │
│  (read/write YAML)  │                              │  (with user confirm)    │
└─────────────────────┘                              └─────────────────────────┘
```

### Phases

| Phase | Scope |
|--------|--------|
| **4a — Repo layout** | Add a **workspace package** or `apps/copilot-server` with Mastra (agent + tools). Add CopilotKit to the Vite app per official React integration. |
| **4b — Read path** | Tooling to **fetch** current YAML (reuse stream endpoint or add `GET /api/linkml/:id`) so the model sees the same content as the canvas parser. |
| **4c — Safe writes** | **No silent overwrite:** return a **patch** (unified diff or structured ops) → UI shows preview → user **Apply** or **Reject**. Optional: write through Vite dev middleware with backup and validation (`js-yaml` parse + optional LinkML linter if available). |
| **4d — Grounding** | System prompt + RAG over `ontologies/docs/*.md` and slot/class descriptions so edits stay consistent with the GSD capability model. |
| **4e — Multi-file** | Once §1 lands, bind tools to **canvas-selected** YAML path with allowlist. |
| **4f — E2B lane (optional)** | Delegate **tool execution** (patch apply, `linkml validate`, codegen) to an **E2B** sandbox (see **§5**); host only receives diff/artifact back. Reduces trust in arbitrary shell on the developer laptop for high-risk flows. |

### Risks & mitigations

- **Security:** Restrict writable paths; never pass raw paths from the model without server-side validation.  
- **Conflicts:** User edits in IDE + copilot apply → detect `mtime` / etag before write.  
- **Cost/latency:** Stream responses in UI; cap tool round-trips per user action.  
- **Sandbox (§5):** Never pass long-lived repo credentials into sandboxes; use short-lived tokens, minimal filesystem snapshot, and explicit “promote to host” step.

### Acceptance criteria (summary)

- CopilotKit chat embedded in the app (or dedicated route).  
- Mastra agent can answer questions about the schema using file + docs context.  
- Apply flow updates YAML only after explicit user confirmation and successful parse.

### Testing hooks (§4)

- **Unit:** Patch grammar validation; YAML parse after merge; allowlist matcher.  
- **Integration:** Mastra tool handlers with mocked LLM; HTTP contract tests for apply endpoint.  
- **BDD:** Preview/apply/reject; concurrent edit (`mtime`) conflict path.  
- **E2E:** Stubbed model returning fixed tool calls—**never** block CI on live LLM.

---

## 5. Making edits in an E2B sandbox

**Goal:** Support **isolated execution** for ontology-editing workflows—especially AI/tooling that runs shell, installs packages, or rewrites files—by defaulting or optionally routing work through an **[E2B](https://e2b.dev) code sandbox** instead of only the local Vite dev server or bare host. Aligns with the **execution lane** idea in `gsd-capabilities.linkml.yaml` (e.g. P5 / E2B) and the roadmap’s **security + operational ontology** themes.

### Why E2B here

- **Blast radius:** Malformed or adversarial tool output runs in a throwaway VM, not the engineer’s home directory.  
- **Reproducibility:** Same template + env for “validate LinkML → apply patch → run checks” across machines.  
- **Promotion model:** Sandbox produces a **diff or file bundle**; the user (or CI) **merges** into the real repo after review—mirrors §4’s “no silent overwrite” rule.

### Phases

| Phase | Scope |
|--------|--------|
| **5a — Spike** | Prove E2B SDK from Node (Mastra tool host or small API): create sandbox, write fixture YAML, run `js-yaml` parse + optional `linkml` CLI if available in template, return stdout + exit code. Measure cold start p95. |
| **5b — Template** | Maintain an **E2B template** (Dockerfile or E2B template repo) with pinned tooling: Python/Node, LinkML toolchain as needed, **no** org secrets baked in. Version templates and document upgrade path. |
| **5c — Edit loop** | Flow: **sync minimal context** into sandbox (selected files or patch) → run agent/script → **pull diff or patched files** out → show in UI (same preview UX as §4c) → user confirms apply to **host** workspace (Vite middleware or direct FS in dev). |
| **5d — UI affordance** | Settings or per-action toggle: **Local apply** vs **Sandbox apply**; status chip (sandbox starting / running / torn down); link to E2B dashboard for debugging. |
| **5e — CI parity (optional)** | Same template invoked from CI for “heavy” validation jobs that shouldn’t pollute the runner image—only if cost and caching justify it. |

### Architecture sketch

```
┌──────────────────┐     ┌─────────────────────┐     ┌────────────────────────┐
│  React_flow_test │────▶│  Backend / Mastra   │────▶│  E2B sandbox           │
│  (preview UI)    │     │  (orchestrator)     │     │  (edit · validate ·    │
└──────────────────┘     └──────────┬──────────┘     │   run checks)          │
                                    │                └───────────┬────────────┘
                                    │  diff / artifact           │
                                    ▼                            │
                         ┌─────────────────────┐                   │
                         │  User confirm →     │◀──────────────────┘
                         │  host FS / git       │
                         └─────────────────────┘
```

### Risks & mitigations

- **Cost:** Cap session length; destroy sandboxes eagerly; avoid per-keystroke sandboxes.  
- **Secrets:** Inject via E2B env at runtime with minimal scope; rotate; audit template layers.  
- **Drift:** Sandbox file tree ≠ monorepo—only sync **explicit allowlisted paths** or unified diffs.  
- **Determinism:** Pin template versions; log template id + sandbox id with each proposed edit for audit.

### Acceptance criteria (summary)

- At least one **end-to-end path**: user triggers an edit that runs in E2B and returns a **reviewable** result before touching host files.  
- **Local-only path** remains available for offline dev (§4c unchanged).  
- Documentation: required env vars (e.g. `E2B_API_KEY`), template name, and troubleshooting.

### Testing hooks (§5)

- **Unit:** Allowlist for paths sent to sandbox; diff parser; mapping of exit codes → user-visible errors.  
- **Integration:** Mock E2B client or **recorded** sessions against E2B test project (gated secret in CI); assert lifecycle: create → run → destroy.  
- **BDD:** `@e2b` — “Given sandbox mode, When edit completes, Then host file unchanged until confirm.”  
- **E2E:** Optional nightly job with real E2B (not every PR) to avoid cost/flake; PRs use mock.

---

## Cross-cutting priorities

- **Testing:** Follow **Testing strategy** above; extend `linkmlToFlow` / SSE / layout tests as behavior grows; keep BDD and E2E thin but mandatory for P0 journeys.  
- **Docs:** Update `README.md` with how to run `npm test`, BDD, and E2E from this folder; link to CI badge or report when available.  
- **Licensing:** Confirm CopilotKit, Mastra, and any React Flow Plus features meet project license policy.  
- **Security tests (§4):** Fuzz path parameters; assert no directory traversal; red-team prompt injection against “ignore allowlist” instructions in dev docs only (not automated on external APIs without approval).  
- **E2B (§5):** Document and test **template provenance**; never commit API keys; optional separate CI workflow with org-provided `E2B_API_KEY` secret.

---

## Suggested sequencing

1. **§2 (Palantir polish)** in parallel with **§3 (React Flow gaps)** — improves baseline for demos; cross-check against the **Palantir reference** section for layout and density patterns.  
2. **§1 (multi-canvas)** before **§4e** and to simplify comparing schemas.  
3. **§4a–4c** as a vertical slice (read → suggest → apply with guardrails), then **§4d–4e** (and **§4f** when §5 is underway).
4. **§5a–§5c** after or in parallel with **§4c** once local preview/apply is understood—E2B is an **execution backend**, not a substitute for the preview contract.
5. Longer term, map **ontology editor vision** items into epics (validation, search, versioning) as the stack matures—most won’t ship in §1–§5 alone.
6. **Testing track in parallel:** land **unit + integration** for existing LinkML stream + `linkmlToFlow` early; add **BDD smoke + E2E** before §1/§4 expand the state surface; gate **§5** E2E on nightly or manual job unless mocks suffice.

---

*Last updated: §5 E2B sandbox edits (phases, architecture, risks, tests); §4f cross-link; hypotheses + sequencing updated; adjust dates and owners in your tracker as work is scheduled.*
