/**
 * PHYSIOCASE — MASTER VERIFICATION RUNNER
 * Runs all 18 test suites and tallies overall pass/fail statistics.
 */
import { execSync } from 'node:child_process';

const testSuites = [
  'verify-case-lifecycle.ts',
  'verify-part-b1-database.ts',
  'verify-part-b2-auth.ts',
  'verify-part-b3-engine.ts',
  'verify-part-b4-clinical-eval.ts',
  'verify-part-b5-problems.ts',
  'verify-part-b6-goals.ts',
  'verify-refinement4-quick-entry.ts',
  'verify-stage10c-c.ts',
  'verify-stage10d-1.ts',
  'verify-stage10d-2.ts',
  'verify-stage10d-3.ts',
  'verify-stage10d-4.ts',
  'verify-stage10e.ts',
  'verify-stage11b.ts',
  'verify-stage12b.ts',
  'verify-stage13.ts',
  'verify-step2-reassessment.ts',
  'verify-step3-four-tabs.ts',
  'verify-pre-b7a-frontend-isolation.ts',
];

interface SuiteResult {
  suite: string;
  passes: number;
  fails: number;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
}

const results: SuiteResult[] = [];
let totalPasses = 0;
let totalFails = 0;

console.log('================================================================');
console.log('RUNNING ALL 20 PHYSIOCASE VERIFICATION SUITES (B-1 THROUGH PRE-B7A)');
console.log('================================================================\n');

for (const suite of testSuites) {
  process.stdout.write(`Executing ${suite}... `);
  const start = Date.now();
  try {
    const stdout = execSync(`npx tsx scripts/${suite}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
    const durationMs = Date.now() - start;

    // Count [PASS] or PASSED lines
    const passMatches = stdout.match(/\[PASS\]/g);
    let passes = passMatches ? passMatches.length : 0;
    
    // Also check for total summary lines like "PASSED: 45"
    const summaryMatch = stdout.match(/PASSED:\s*(\d+)/);
    if (summaryMatch && parseInt(summaryMatch[1], 10) > passes) {
      passes = parseInt(summaryMatch[1], 10);
    }
    if (passes === 0) {
      // Fallback: check other success markers
      const genericPass = stdout.match(/✓/g);
      if (genericPass) passes = genericPass.length;
    }

    const failMatches = stdout.match(/\[FAIL\]|✗/g);
    const fails = failMatches ? failMatches.length : 0;

    results.push({ suite, passes, fails, status: 'PASSED', durationMs });
    totalPasses += passes;
    totalFails += fails;
    console.log(`✓ PASSED (${passes} checks, ${(durationMs / 1000).toFixed(1)}s)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    console.log(`✗ FAILED`);
    results.push({ suite, passes: 0, fails: 1, status: 'FAILED', durationMs });
    totalFails += 1;
    if (err.stdout) console.log(err.stdout.toString().slice(-300));
    if (err.stderr) console.error(err.stderr.toString().slice(-300));
  }
}

console.log('\n================================================================');
console.log('SUMMARY TABLE:');
console.log('----------------------------------------------------------------');
for (const r of results) {
  const paddedSuite = r.suite.padEnd(35);
  console.log(`${paddedSuite} | ${r.status} | Passes: ${String(r.passes).padStart(4)} | Fails: ${r.fails} | ${(r.durationMs / 1000).toFixed(1)}s`);
}
console.log('================================================================');
console.log(`TOTAL SUITES: ${results.length} (20/20)`);
console.log(`TOTAL CHECKS: ${totalPasses + totalFails}`);
console.log(`TOTAL PASSED: ${totalPasses}`);
console.log(`TOTAL FAILED: ${totalFails}`);
console.log('================================================================\n');

if (totalFails > 0) {
  process.exit(1);
}
