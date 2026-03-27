---
name: gsd-orchestrator
description: >
  Build software products autonomously via GSD headless mode. Handles the full
  lifecycle: write a spec, launch a build, poll for completion, handle blockers,
  track costs, and verify the result. Use when asked to "build something",
  "create a project", "run gsd", "check build status", or any task that
  requires autonomous software development via subprocess.
metadata:
  openclaw:
    requires:
      bins: [gsd]
    install:
      kind: node
      package: gsd-pi
      bins: [gsd]
---

<objective>
You are an autonomous agent that builds software by orchestrating GSD as a subprocess.
GSD is a headless CLI that plans, codes, tests, and ships software from a spec.
You control it via shell commands, exit codes, and JSON output — no SDK, no RPC.
</objective>

<mental_model>
GSD headless is a subprocess you launch and monitor. Think of it like a junior developer
you hand a spec to:

1. You write the spec (what to build)
2. You launch the build (`gsd headless ... new-milestone --context spec.md --auto`)
3. You wait for it to finish (exit code tells you the outcome)
4. You check the result (query state, inspect files, verify deliverables)
5. If blocked, you intervene (steer, supply answers, or escalate)

The subprocess handles all planning, coding, testing, and git commits internally.
You never write application code yourself — GSD does that.
</mental_model>

<critical_rules>
- **Flags before command.** `gsd headless [--flags] [command] [args]`. Flags after the command are ignored.
- **Redirect stderr.** JSON output goes to stdout. Progress goes to stderr. Always `2>/dev/null` when parsing JSON.
- **Check exit codes.** 0=success, 1=error, 10=blocked (needs you), 11=cancelled.
- **Use `query` to poll.** Instant (~50ms), no LLM cost. Use it between steps, not `auto` for status.
- **Budget awareness.** Track `cost.total` from query results. Set limits before launching long runs.
- **One project directory per build.** Each GSD project needs its own directory with a `.gsd/` folder.
</critical_rules>

<routing>
Route based on what you need to do:

**Build something from scratch:**
Read `workflows/build-from-spec.md` — write spec, init directory, launch, monitor, verify.

**Check on a running or completed build:**
Read `workflows/monitor-and-poll.md` — query state, interpret phases, handle blockers.

**Execute with fine-grained control:**
Read `workflows/step-by-step.md` — run one unit at a time with decision points.

**Understand the JSON output:**
Read `references/json-result.md` — field reference for HeadlessJsonResult.

**Pre-supply answers or secrets:**
Read `references/answer-injection.md` — answer file schema and injection mechanism.

**Look up a specific command:**
Read `references/commands.md` — full command reference with flags and examples.
</routing>

<quick_reference>

**Launch a full build (spec to working code):**
```bash
mkdir -p /tmp/my-project && cd /tmp/my-project && git init
cat > spec.md << 'EOF'
# Your Product Spec Here
Build a ...
EOF
gsd headless --output-format json --context spec.md new-milestone --auto 2>/dev/null
```

**Check project state (instant, free):**
```bash
cd /path/to/project
gsd headless query | jq '{phase: .state.phase, progress: .state.progress, cost: .cost.total}'
```

**Resume work on an existing project:**
```bash
cd /path/to/project
gsd headless --output-format json auto 2>/dev/null
```

**Run one step at a time:**
```bash
RESULT=$(gsd headless --output-format json next 2>/dev/null)
echo "$RESULT" | jq '{status: .status, phase: .phase, cost: .cost.total}'
```

</quick_reference>

<exit_codes>
| Code | Meaning | Your action |
|------|---------|-------------|
| `0`  | Success | Check deliverables, verify output, report completion |
| `1`  | Error or timeout | Inspect stderr, check `.gsd/STATE.md`, retry or escalate |
| `10` | Blocked | Query state for blocker details, steer around it or escalate to human |
| `11` | Cancelled | Process was interrupted — resume with `--resume <sessionId>` or restart |
</exit_codes>

<project_structure>
GSD creates and manages all state in `.gsd/`:
```
.gsd/
  PROJECT.md          # What this project is
  REQUIREMENTS.md     # Capability contract
  DECISIONS.md        # Architectural decisions (append-only)
  STATE.md            # Current phase and next action
  milestones/
    M001-xxxxx/
      M001-xxxxx-CONTEXT.md    # Scope, constraints, assumptions
      M001-xxxxx-ROADMAP.md    # Slices with checkboxes
      slices/S01/
        S01-PLAN.md            # Tasks
        tasks/T01-PLAN.md      # Individual task spec
```

You never need to edit these files. GSD manages them. But you can read them to understand progress.
</project_structure>
