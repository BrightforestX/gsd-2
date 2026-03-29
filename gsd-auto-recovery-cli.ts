#!/usr/bin/env node

/**
 * GSD Auto Recovery CLI Utility
 *
 * Standalone CLI tool for diagnosing and fixing /gsd auto issues.
 * Can be run independently of GSD or integrated as a command.
 *
 * Usage:
 *   node gsd-auto-recovery-cli.ts diagnose
 *   node gsd-auto-recovery-cli.ts fix
 *   node gsd-auto-recovery-cli.ts report
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

interface DiagnosticResult {
  category: 'critical' | 'warning' | 'info';
  issue: string;
  solution?: string;
  command?: string;
  autoFix?: boolean;
}

interface RecoveryReport {
  timestamp: Date;
  diagnostics: DiagnosticResult[];
  autoFixesApplied: string[];
  manualSteps: string[];
  success: boolean;
}

class GSDAutoRecovery {
  private readonly projectRoot: string;
  private readonly homeDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.homeDir = homedir();
  }

  async run(action: string): Promise<void> {
    switch (action) {
      case 'diagnose':
        return this.diagnose();
      case 'fix':
        return this.fix();
      case 'report':
        return this.generateReport();
      case 'verify':
        return this.verify();
      default:
        console.log(`Unknown action: ${action}`);
        console.log('Available actions: diagnose, fix, report, verify');
        process.exit(1);
    }
  }

  private async diagnose(): Promise<void> {
    console.log('🔍 GSD Auto-Mode Diagnostic Tool');
    console.log('================================');

    const issues: DiagnosticResult[] = [
      ...await this.checkEnvironment(),
      ...await this.checkFileSystem(),
      ...await this.checkGit(),
      ...await this.checkConfiguration(),
      ...await this.checkProcesses(),
      ...await this.checkPermissions()
    ];

    const critical = issues.filter(i => i.category === 'critical');
    const warnings = issues.filter(i => i.category === 'warning');

    console.log(`\n📊 Results: ${critical.length} critical, ${warnings.length} warnings\n`);

    issues.forEach(issue => {
      const icon = issue.category === 'critical' ? '🚨' :
                   issue.category === 'warning' ? '⚠️' : 'ℹ️';
      const tag = issue.category.toUpperCase();
      console.log(`${icon} ${tag}: ${issue.issue}`);

      if (issue.solution) {
        console.log(`   💡 ${issue.solution}`);
      }

      if (issue.command && issue.autoFix) {
        console.log(`   🔧 Auto-fix available: ${issue.command}`);
      }
    });

    if (critical.length > 0) {
      console.log('\n❌ Critical issues prevent auto-mode. Run "fix" to attempt automated repair.');
    } else if (warnings.length > 0) {
      console.log('\n⚠️  Warnings detected. Auto-mode may be unstable. Run "verify" to test.');
    } else {
      console.log('\n✅ No issues detected. Auto-mode should work correctly.');
    }
  }

  private async fix(): Promise<void> {
    console.log('🔧 GSD Auto-Mode Auto-Fix Tool');
    console.log('==============================');

    const diagnostics = [
      ...(await this.checkEnvironment()),
      ...(await this.checkFileSystem()),
      ...(await this.checkGit()),
      ...(await this.checkConfiguration()),
      ...(await this.checkPermissions())
    ];

    const fixableIssues = diagnostics.filter(d => d.autoFix && d.command);
    let fixedCount = 0;

    console.log(`Found ${fixableIssues.length} issues that can be auto-fixed\n`);

    for (const issue of fixableIssues) {
      try {
        console.log(`🔧 Fixing: ${issue.issue}`);
        execSync(issue.command!, { stdio: 'inherit' });
        console.log(`✅ Fixed: ${issue.issue}\n`);
        fixedCount++;
      } catch (error) {
        console.log(`❌ Failed to fix: ${issue.issue}`);
        console.log(`   Error: ${(error as Error).message}\n`);
      }
    }

    console.log(`🎉 Auto-fix complete: ${fixedCount}/${fixableIssues.length} issues resolved`);

    if (fixedCount < fixableIssues.length) {
      console.log('\n⚠️  Some issues require manual intervention. Run "diagnose" again.');
    } else if (fixedCount > 0) {
      console.log('\n✅ Run "verify" to test that auto-mode now works.');
    }
  }

  private async generateReport(): Promise<void> {
    console.log('📋 Generating GSD Auto-Mode Health Report...\n');

    const report: RecoveryReport = {
      timestamp: new Date(),
      diagnostics: [
        ...(await this.checkEnvironment()),
        ...(await this.checkFileSystem()),
        ...(await this.checkGit()),
        ...(await this.checkConfiguration()),
        ...(await this.checkProcesses()),
        ...(await this.checkPermissions())
      ],
      autoFixesApplied: [],
      manualSteps: [],
      success: false
    };

    // Determine success rate
    const critical = report.diagnostics.filter(d => d.category === 'critical');
    report.success = critical.length === 0;

    // Identify manual steps needed
    report.manualSteps = report.diagnostics
      .filter(d => !d.autoFix)
      .map(d => d.solution || d.issue);

    const reportPath = join(this.projectRoot, '.gsd', 'auto-recovery-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Report saved to: ${reportPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Critical issues: ${critical.length}`);
    console.log(`   Warnings: ${report.diagnostics.filter(d => d.category === 'warning').length}`);
    console.log(`   Status: ${report.success ? '✅ READY' : '❌ NEEDS ATTENTION'}`);

    if (!report.success) {
      console.log(`\n🔧 Manual steps required:`);
      report.manualSteps.slice(0, 5).forEach(step => console.log(`   • ${step}`));
      if (report.manualSteps.length > 5) {
        console.log(`   ... and ${report.manualSteps.length - 5} more`);
      }
    }
  }

  private async verify(): Promise<void> {
    console.log('✅ GSD Auto-Mode Verification Tool');
    console.log('===================================');

    try {
      // Test basic preconditions
      console.log('Testing environment prerequisites...');
      const envIssues = await this.checkEnvironment();
      if (envIssues.some(i => i.category === 'critical')) {
        throw new Error('Environment issues detected');
      }

      // Test file system access
      console.log('Testing file system access...');
      const fsIssues = await this.checkFileSystem();
      if (fsIssues.some(i => i.category === 'critical')) {
        throw new Error('File system issues detected');
      }

      // Test Git access
      console.log('Testing Git repository...');
      const gitIssues = await this.checkGit();
      if (gitIssues.some(i => i.category === 'critical')) {
        throw new Error('Git issues detected');
      }

      console.log('\n🎉 Verification passed! Auto-mode prerequisites are met.');

      // Optional: Try to start GSD briefly
      console.log('\nTesting GSD startup...');
      const gsdProcess = spawn('gsd', ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      });

      return new Promise((resolve) => {
        gsdProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ GSD startup successful');
          } else {
            console.log('⚠️  GSD startup had issues, but auto-mode may still work');
          }
          resolve();
        });

        gsdProcess.on('error', () => {
          console.log('⚠️  GSD not found in PATH, but may be available through other means');
        });
      });

    } catch (error) {
      console.log(`\n❌ Verification failed: ${(error as Error).message}`);
      console.log('\n💡 Run "diagnose" to identify specific issues');
      process.exit(1);
    }
  }

  // == Diagnostic Check Methods ==

  private async checkEnvironment(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];

    // Check Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 22) {
        issues.push({
          category: 'critical',
          issue: `Node.js version ${nodeVersion} is too old (need >=22)`,
          solution: 'Update Node.js to version 22 or later',
          autoFix: false
        });
      }
    } catch {
      issues.push({
        category: 'critical',
        issue: 'Node.js not found in PATH',
        solution: 'Install Node.js version 22 or later',
        autoFix: false
      });
    }

    // Check npm
    try {
      execSync('npm --version');
    } catch {
      issues.push({
        category: 'critical',
        issue: 'npm not found in PATH',
        solution: 'Install npm (comes with Node.js)',
        autoFix: false
      });
    }

    // Check GSD installation
    try {
      execSync('gsd --version', { stdio: 'pipe' });
    } catch {
      issues.push({
        category: 'critical',
        issue: 'GSD CLI not found in PATH',
        solution: 'Run "npm install -g gsd-pi@latest" to install GSD',
        autoFix: false
      });
    }

    return issues;
  }

  private async checkFileSystem(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];

    // Check .gsd directory exists and is accessible
    const gsdPath = join(this.projectRoot, '.gsd');
    if (!existsSync(gsdPath)) {
      issues.push({
        category: 'critical',
        issue: '.gsd directory missing',
        solution: 'Initialize GSD project by running /gsd in the project root',
        autoFix: false
      });
    } else {
      try {
        // Check if we can read/write to .gsd
        const testFile = join(gsdPath, 'diagnostic-test.tmp');
        writeFileSync(testFile, 'test');
        readFileSync(testFile);
        execSync(`rm "${testFile}"`);
      } catch {
        issues.push({
          category: 'critical',
          issue: 'Cannot read/write to .gsd directory',
          solution: 'Check file permissions on .gsd directory',
          autoFix: false
        });
      }
    }

    // Check critical GSD files
    const requiredFiles = ['PROJECT.md', 'REQUIREMENTS.md', 'STATE.md'];
    for (const file of requiredFiles) {
      const filePath = join(gsdPath, file);
      if (!existsSync(filePath)) {
        issues.push({
          category: 'warning',
          issue: `${file} missing from .gsd directory`,
          solution: 'Run /gsd to initialize missing project files',
          autoFix: false
        });
      }
    }

    return issues;
  }

  private async checkGit(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];

    // Check if we're in a Git repository
    try {
      execSync('git rev-parse --git-dir', { cwd: this.projectRoot, stdio: 'pipe' });
    } catch {
      issues.push({
        category: 'critical',
        issue: 'Not in a Git repository',
        solution: 'Initialize Git repository with "git init"',
        autoFix: true,
        command: 'git init'
      });
    }

    // Check Git configuration
    try {
      execSync('git config user.name', { stdio: 'pipe' });
    } catch {
      issues.push({
        category: 'warning',
        issue: 'Git user.name not configured',
        solution: 'Configure Git user name',
        autoFix: true,
        command: 'git config user.name "GSD User"'
      });
    }

    try {
      execSync('git config user.email', { stdio: 'pipe' });
    } catch {
      issues.push({
        category: 'warning',
        issue: 'Git user.email not configured',
        solution: 'Configure Git user email',
        autoFix: true,
        command: 'git config user.email "gsd@example.com"'
      });
    }

    return issues;
  }

  private async checkConfiguration(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];

    // Check for .env file
    const envPath = join(this.projectRoot, '.env');
    if (!existsSync(envPath)) {
      try {
        // Check for global GSD preferences
        const prefsPath = join(this.homeDir, '.gsd', 'PREFERENCES.md');
        if (!existsSync(prefsPath)) {
          issues.push({
            category: 'warning',
            issue: 'No GSD preferences found',
            solution: 'Run /gsd prefs to configure GSD preferences',
            autoFix: false
          });
        }
      } catch {
        // Home directory access failed
        issues.push({
          category: 'warning',
          issue: 'Cannot access global GSD configuration',
          solution: 'Check home directory permissions',
          autoFix: false
        });
      }
    }

    return issues;
  }

  private async checkProcesses(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];

    // Check for existing GSD processes
    try {
      const output = execSync('pgrep -f gsd', { encoding: 'utf8' });
      if (output.trim().split('\n').length > 1) {
        issues.push({
          category: 'warning',
          issue: 'Multiple GSD processes running',
          solution: 'Terminate extra GSD processes if experiencing issues',
          autoFix: true,
          command: 'pkill -f gsd'
        });
      }
    } catch {
      // pgrep not available or no processes found - not an issue
    }

    return issues;
  }

  private async checkPermissions(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];

    const gsdPath = join(this.projectRoot, '.gsd');
    if (existsSync(gsdPath)) {
      try {
        const stats = statSync(gsdPath);
        if (!(stats.mode & 0o755)) {
          issues.push({
            category: 'critical',
            issue: '.gsd directory has insufficient permissions',
            solution: 'Run "chmod 755 .gsd" to fix permissions',
            autoFix: true,
            command: 'chmod 755 .gsd'
          });
        }
      } catch {
        // Can't check permissions
      }
    }

    return issues;
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node gsd-auto-recovery-cli.ts [diagnose|fix|report|verify]');
    process.exit(1);
  }

  const recovery = new GSDAutoRecovery();
  await recovery.run(args[0]);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { GSDAutoRecovery };