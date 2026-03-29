/**
 * Auto Recovery Service for GSD
 *
 * This service provides automated diagnosis and repair of common issues
 * that prevent /gsd auto from functioning properly.
 *
 * Usage in GSD extensions:
 * - Hook into auto-mode startup failures
 * - Provide CLI command /gsd recover
 * - Export diagnostics and recovery reports
 */

interface AutoModeFailure {
  phase: 'startup' | 'execution' | 'completion' | 'state-transition';
  error: Error;
  context: Record<string, any>;
  timestamp: Date;
}

interface RecoveryAction {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  action: () => Promise<boolean>;
  rollback?: () => Promise<void>;
  estimatedDuration: number; // milliseconds
}

export class AutoRecoveryService {
  private failures: AutoModeFailure[] = [];
  private isRecovering = false;

  constructor(
    private readonly doctorService: DoctorService,
    private readonly stateManager: StateManager,
    private readonly environmentChecker: EnvironmentChecker
  ) {}

  /**
   * Main recovery entry point - analyze failure and attempt automated fixes
   */
  async recover(failure: Error, context: Record<string, any>): Promise<RecoveryResult> {
    if (this.isRecovering) {
      throw new Error('Recovery already in progress');
    }

    this.isRecovering = true;
    const failureRecord: AutoModeFailure = {
      phase: this.determinePhase(context),
      error: failure,
      context,
      timestamp: new Date()
    };

    this.failures.push(failureRecord);

    try {
      const diagnostics = await this.diagnoseFailure(failureRecord);
      const recoveryPlan = this.createRecoveryPlan(diagnostics);

      console.log('🔧 Auto-recovery initiated');
      console.log(`Issue: ${diagnostics.primaryIssue}`);
      console.log(`Confidence: ${diagnostics.confidence}%`);

      const result = await this.executeRecovery(recoveryPlan);
      await this.validateRecovery(result);

      return result;
    } catch (recoveryError) {
      console.error('❌ Auto-recovery failed:', recoveryError);
      await this.escalateToManual(recoveryError, failureRecord);
      throw recoveryError;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Diagnose the specific failure type and root cause
   */
  private async diagnoseFailure(failure: AutoModeFailure): Promise<FailureDiagnostics> {
    const diagnostics: FailureDiagnostics = {
      primaryIssue: '',
      rootCause: '',
      confidence: 0,
      affectedComponents: [],
      recommendedActions: []
    };

    // Environment-related failures
    if (await this.environmentChecker.checkPrerequisites()) {
      const envIssues = await this.environmentChecker.getIssues();
      if (envIssues.length > 0) {
        diagnostics.primaryIssue = 'Environment prerequisites not met';
        diagnostics.rootCause = envIssues[0].message;
        diagnostics.confidence = 95;
        diagnostics.affectedComponents = ['environment'];
        diagnostics.recommendedActions = [
          'Validate Node.js version (>=22)',
          'Check npm package dependencies',
          'Verify API key configurations',
          'Confirm Git repository state'
        ];
      }
    }

    // State corruption failures
    const stateHealth = await this.doctorService.checkStateIntegrity();
    if (!stateHealth.healthy) {
      diagnostics.primaryIssue = 'Project state corruption detected';
      diagnostics.rootCause = stateHealth.issues[0];
      diagnostics.confidence = 90;
      diagnostics.affectedComponents = ['state', 'database'];
      diagnostics.recommendedActions = [
        'Rebuild state from disk',
        'Validate milestone consistency',
        'Repair database records',
        'Clean up temporary files'
      ];
    }

    // Resource exhaustion failures
    if (failure.error.message.includes('memory') || failure.error.message.includes('ENOSPC')) {
      diagnostics.primaryIssue = 'Resource exhaustion';
      diagnostics.rootCause = 'Insufficient system resources for operation';
      diagnostics.confidence = 85;
      diagnostics.affectedComponents = ['system', 'resources'];
      diagnostics.recommendedActions = [
        'Clear temporary files and caches',
        'Free up disk space',
        'Terminate idle processes',
        'Increase system memory limits'
      ];
    }

    // Network/API failures
    if (failure.error.message.includes('ECONNREFUSED') || failure.error.message.includes('timeout')) {
      diagnostics.primaryIssue = 'Network connectivity issues';
      diagnostics.rootCause = 'API endpoint unreachable or rate limited';
      diagnostics.confidence = 80;
      diagnostics.affectedComponents = ['network', 'api'];
      diagnostics.recommendedActions = [
        'Verify API key validity',
        'Check network connectivity',
        'Implement retry logic with backoff',
        'Update endpoint configurations'
      ];
    }

    return diagnostics;
  }

  /**
   * Create a prioritized recovery action plan
   */
  private createRecoveryPlan(diagnostics: FailureDiagnostics): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Environment fixes
    if (diagnostics.affectedComponents.includes('environment')) {
      actions.push({
        id: 'fix-environment',
        priority: 'critical',
        description: 'Repair environment prerequisites and dependencies',
        action: async () => {
          const fixed = await this.environmentChecker.fixIssues();
          return fixed;
        },
        estimatedDuration: 10000
      });
    }

    // State repair
    if (diagnostics.affectedComponents.includes('state')) {
      actions.push({
        id: 'fix-state',
        priority: 'critical',
        description: 'Rebuild corrupted state files and database records',
        action: async () => {
          const fixed = await this.stateManager.repairState();
          return fixed;
        },
        rollback: async () => {
          await this.stateManager.rollbackRepairs();
        },
        estimatedDuration: 15000
      });
    }

    // Resource cleanup
    if (diagnostics.affectedComponents.includes('system')) {
      actions.push({
        id: 'clean-resources',
        priority: 'high',
        description: 'Clean up system resources and temporary files',
        action: async () => {
          // Implementation would clear caches, temp files, free memory
          return true;
        },
        estimatedDuration: 5000
      });
    }

    // Network recovery
    if (diagnostics.affectedComponents.includes('api')) {
      actions.push({
        id: 'fix-connectivity',
        priority: 'high',
        description: 'Resolve network connectivity and API issues',
        action: async () => {
          // Implementation would retry connections, update endpoints
          return true;
        },
        estimatedDuration: 2000
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Execute recovery actions in priority order
   */
  private async executeRecovery(plan: RecoveryAction[]): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      success: false,
      actionsTaken: [],
      remainingIssues: [],
      recommendations: []
    };

    for (const action of plan) {
      try {
        console.log(`🔧 Attempting: ${action.description}`);
        const success = await action.action();

        result.actionsTaken.push({
          id: action.id,
          success,
          description: action.description,
          timestamp: new Date(),
          duration: action.estimatedDuration
        });

        if (success) {
          console.log(`✅ ${action.description} - SUCCESS`);
        } else {
          console.log(`❌ ${action.description} - FAILED`);
          result.remainingIssues.push(action.description);
        }
      } catch (error) {
        console.log(`❌ ${action.description} - ERROR: ${error.message}`);
        result.remainingIssues.push(`${action.description}: ${error.message}`);

        // Try rollback if available
        if (action.rollback) {
          try {
            await action.rollback();
            console.log(`↩️  Rolled back ${action.id}`);
          } catch (rollbackError) {
            console.error(`🆘 Rollback failed for ${action.id}: ${rollbackError.message}`);
          }
        }
      }
    }

    result.success = result.remainingIssues.length === 0;
    result.recommendations = this.generateRecommendations(result);

    return result;
  }

  /**
   * Validate that recovery was successful
   */
  private async validateRecovery(result: RecoveryResult): Promise<void> {
    if (result.success) {
      // Run doctor checks to verify system health
      const healthCheck = await this.doctorService.runHealthCheck();
      if (healthCheck.score < 80) {
        console.warn('⚠️  Recovery completed but system health is suboptimal');
        result.remainingIssues.push('System health below optimal threshold');
      } else {
        console.log('🎉 Recovery validation passed - system health restored');
      }
    }
  }

  /**
   * Determine which phase the failure occurred in
   */
  private determinePhase(context: Record<string, any>): AutoModeFailure['phase'] {
    if (context.startup) return 'startup';
    if (context.taskId && context.sliceId) return 'execution';
    if (context.completing) return 'completion';
    return 'state-transition';
  }

  /**
   * Generate human-readable recovery recommendations
   */
  private generateRecommendations(result: RecoveryResult): string[] {
    const recommendations: string[] = [];

    if (result.remainingIssues.length > 0) {
      recommendations.push('Manual intervention may be required for: ' + result.remainingIssues.join(', '));
    }

    if (result.success) {
      recommendations.push('Run /gsd auto --verify to confirm auto-mode works');
      recommendations.push('Monitor system health with /gsd doctor for the next few executions');
    } else {
      recommendations.push('Consider running /gsd forensics for deeper analysis');
      recommendations.push('Available escalation: /gsd discuss with senior team member');
    }

    return recommendations;
  }

  /**
   * Escalate to manual recovery when automated fixes fail
   */
  private async escalateToManual(error: Error, failure: AutoModeFailure): Promise<void> {
    console.log('📞 Escalating to manual recovery');
    console.log(`Failure phase: ${failure.phase}`);
    console.log(`Error: ${error.message}`);
    console.log('📋 Run /gsd forensics for complete diagnostic report');
  }
}

/**
 * Integration hooks for GSD extension system
 */
export function registerAutoRecovery(): void {
  // Register as MCP tool
  registerTool({
    name: 'auto-recover',
    description: 'Automatically diagnose and fix common /gsd auto issues',
    parameters: {
      type: 'object',
      properties: {
        error: { type: 'string', description: 'Error message from failed auto-mode' },
        context: { type: 'object', description: 'Contextual information about the failure' }
      }
    },
    handler: async ({ error, context }) => {
      const recovery = new AutoRecoveryService(
        new DoctorService(),
        new StateManager(),
        new EnvironmentChecker()
      );

      return await recovery.recover(new Error(error), context || {});
    }
  });
}