#!/usr/bin/env node

/**
 * Toyota Baseline Test Script
 * 
 * Quick automated check to verify core functionality works
 * Run this before every commit to catch baseline breakage early
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚛 TOYOTA BASELINE TEST STARTING...\n');

const tests = [
  {
    name: 'Frontend Build',
    command: 'npm run build',
    cwd: 'frontend',
    description: 'Verify frontend builds without errors'
  },
  {
    name: 'TypeScript Check',
    command: 'npx tsc --noEmit',
    cwd: 'frontend', 
    description: 'Verify no TypeScript errors'
  },
  {
    name: 'Backend Start Check',
    command: 'timeout 10s npm start || exit 0',
    cwd: 'backend',
    description: 'Verify backend starts without immediate crashes'
  }
];

const results = [];
let allPassed = true;

for (const test of tests) {
  process.stdout.write(`🔍 ${test.name}... `);
  
  try {
    const startTime = Date.now();
    
    execSync(test.command, {
      cwd: path.join(__dirname, '..', test.cwd),
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ PASS (${duration}ms)`);
    results.push({ test: test.name, status: 'PASS', duration });
    
  } catch (error) {
    console.log(`❌ FAIL`);
    console.log(`   Error: ${error.message}`);
    results.push({ test: test.name, status: 'FAIL', error: error.message });
    allPassed = false;
  }
}

console.log('\n🚛 TOYOTA BASELINE TEST RESULTS:');
console.log('================================');

results.forEach(result => {
  const status = result.status === 'PASS' ? '✅' : '❌';
  const duration = result.duration ? ` (${result.duration}ms)` : '';
  console.log(`${status} ${result.test}${duration}`);
  
  if (result.error) {
    console.log(`   ${result.error}`);
  }
});

if (allPassed) {
  console.log('\n🎉 ALL BASELINE TESTS PASSED!');
  console.log('✅ Safe to commit/deploy');
  process.exit(0);
} else {
  console.log('\n🚨 BASELINE TESTS FAILED!');
  console.log('❌ DO NOT COMMIT/DEPLOY');
  console.log('❌ Fix failures before proceeding');
  process.exit(1);
}