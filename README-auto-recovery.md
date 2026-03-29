# GSD Auto-Recovery System

This system provides automated diagnosis, repair, and prevention of issues that prevent `/gsd auto` from functioning properly.

## Components

### 1. Auto Recovery Service (`auto-recovery-service.ts`)
Core service that diagnoses failures and applies automated fixes:
- **Environment Issues**: Node version, npm deps, API keys, Git config
- **State Corruption**: Rebuilds corrupted State.md, validates database
- **Resource Exhaustion**: Cleans caches, frees memory, terminates processes
- **Network/API Problems**: Retries connections, updates configurations
- **Permission Issues**: Fixes file access, validates Git operations

### 2. Standalone CLI Tool (`gsd-auto-recovery-cli.ts`)
Independent diagnostic utility for pre-GSD troubleshooting:

```bash
# Diagnose issues without running GSD
node gsd-auto-recovery-cli.ts diagnose

# Apply automated fixes
node gsd-auto-recovery-cli.ts fix

# Generate health report
node gsd-auto-recovery-cli.ts report

# Verify auto-mode prerequisites
node gsd-auto-recovery-cli.ts verify
```

### 3. Specialized Agents (6 agent definitions)
Intelligent agents for complex recovery scenarios:
- `auto-fixer`: Automated problem resolution for common issues
- `diagnostic-analyzer`: Deep system analysis with correlation
- `state-repairer`: Safe state reconstruction and repair
- `environment-validator`: System prerequisite verification
- `process-monitor`: Resource and performance tracking
- `contingency-handler`: Last-resort fallback management

### 4. Integration Hooks
System integrates throughout GSD's lifecycle:
- **Pre-execution**: Environment validation
- **Runtime**: Continuous monitoring alerts
- **Failure Handler**: Automated diagnosis and repair
- **Post-execution**: State validation

## Usage Scenarios

### Before Running Auto-Mode
```bash
# Standalone diagnostic
node gsd-auto-recovery-cli.ts diagnose
node gsd-auto-recovery-cli.ts fix
node gsd-auto-recovery-cli.ts verify
```

### During Auto-Mode Failures
Auto-recovery service activates automatically when `/gsd auto` fails, attempting fixes before manual intervention.

### Post-Failure Analysis
```bash
# Deep analysis of what went wrong
/gsd forensics

# Health check with fixes
/gsd doctor -f

# Manual recovery session
/gsd discuss recovery
```

## Common Issues Handled

| Category | Issues | Auto-Fix Level |
|----------|---------|----------------|
| Environment | Node version, npm deps, missing API keys | High |
| State Management | Corrupted files, missing summaries, DB inconsistencies | Medium |
| Resources | Memory exhaustion, disk space, CPU bottlenecks | High |
| Network | API timeouts, rate limits, connection failures | Medium |
| Permissions | File access, Git operations, process limits | High |
| Configuration | Model routing, extension conflicts, missing providers | Low |

## Integration with GSD

### Extension Registration
```typescript
// In GSD extension system
import { registerAutoRecovery } from './auto-recovery-service';

// Registers recovery tools automatically
registerAutoRecovery();
```

### Tool Integration
- **MCP Tool**: `auto-recover` for programmatic access
- **Doctor Service**: Health checks with fix recommendations
- **Agent Subsystem**: Intelligent delegation to specialized recovery agents

### Workflow Integration
1. `/gsd auto` fails → Auto-recover service invoked
2. Diagnosis performed → Recovery plan created
3. Actions executed → Validation performed
4. Manual escalation if needed → Forensic analysis available

## Architecture Principles

### Safety First
- Read-only diagnostics before destructive operations
- Rollback mechanisms for failed fixes
- Transaction-like safety for state repairs

### Intelligent Escalation
- Automated fixes for known patterns
- Human involvement for novel issues
- Progressive disclosure (simple → complex diagnosis)

### Composable Design
- Each component can work independently
- Integration points are well-defined
- Minimal dependencies between components

### Observability
- All actions logged with context
- Recovery reports for auditing
- Health metrics for monitoring

## Development

### Adding New Recovery Actions
1. Identify failure pattern in diagnostic logic
2. Create recovery action with priority
3. Add rollback mechanism if state-changing
4. Test in isolation
5. Add to recovery plan

### Extending Diagnostics
1. Define new check in diagnostic methods
2. Add categorization (critical/warning/info)
3. Provide solution recommendations
4. Mark auto-fixable issues with commands

### Testing Recovery
- Unit tests for individual recovery actions
- Integration tests with `test:live` scenarios
- Property-based testing for edge cases
- Regression tests against known failure patterns

This comprehensive system transforms auto-mode failures from blocking issues into automatically resolved events, significantly improving GSD's reliability and user experience.