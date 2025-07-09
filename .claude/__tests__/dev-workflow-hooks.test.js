const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const TEST_HOOK = path.join(__dirname, '..', 'test-hook.sh');
const LINT_HOOK = path.join(__dirname, '..', 'lint-hook.sh');
const BUILD_HOOK = path.join(__dirname, '..', 'build-hook.sh');
const DEBOUNCER = path.join(__dirname, '..', 'hook-debouncer.sh');

describe('Development Workflow Hooks', () => {
  test('Test hook script is executable', () => {
    expect(fs.existsSync(TEST_HOOK)).toBe(true);
    
    const stats = fs.statSync(TEST_HOOK);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Lint hook script is executable', () => {
    expect(fs.existsSync(LINT_HOOK)).toBe(true);
    
    const stats = fs.statSync(LINT_HOOK);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Build hook script is executable', () => {
    expect(fs.existsSync(BUILD_HOOK)).toBe(true);
    
    const stats = fs.statSync(BUILD_HOOK);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Hook debouncer is executable', () => {
    expect(fs.existsSync(DEBOUNCER)).toBe(true);
    
    const stats = fs.statSync(DEBOUNCER);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Hook ignore file exists', () => {
    const hookignore = path.join(__dirname, '..', '.hookignore');
    expect(fs.existsSync(hookignore)).toBe(true);
    
    const content = fs.readFileSync(hookignore, 'utf8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain('*.log');
  });

  test('Test hook can execute without errors', () => {
    // Test with verify mode to avoid actually running tests
    const result = execSync(`${TEST_HOOK} "" "affected"`, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    expect(result).toContain('Running tests');
  });

  test('Lint hook can execute without errors', () => {
    const result = execSync(`${LINT_HOOK} "" "lint"`, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    expect(result).toContain('Running linter');
  });

  test('Build hook verify mode works', () => {
    const result = execSync(`${BUILD_HOOK} "" "verify"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(result).toContain('Verifying build');
  });
});

describe('Hook Configuration Integration', () => {
  test('Development workflow hooks are configured', () => {
    const configFile = path.join(__dirname, '..', 'claude-code-hooks.json');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    // Check test hooks
    const testHooks = config.hooks.PostToolUse.filter(group => 
      group.hooks && group.hooks.some(h => h.name === 'test-after-edit')
    );
    expect(testHooks.length).toBeGreaterThan(0);
    
    // Check lint hooks
    const lintHooks = config.hooks.PostToolUse.filter(group => 
      group.hooks && group.hooks.some(h => h.name === 'lint-on-edit')
    );
    expect(lintHooks.length).toBeGreaterThan(0);
    
    // Check build hooks
    const buildHooks = config.hooks.PostToolUse.filter(group => 
      group.hooks && group.hooks.some(h => h.name === 'build-on-config-change')
    );
    expect(buildHooks.length).toBeGreaterThan(0);
  });

  test('Hook timeouts are reasonable', () => {
    const configFile = path.join(__dirname, '..', 'claude-code-hooks.json');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    // Check that all hooks have reasonable timeouts
    Object.values(config.hooks).flat().forEach(group => {
      if (group.hooks) {
        group.hooks.forEach(hook => {
          if (hook.timeout) {
            expect(hook.timeout).toBeGreaterThan(1000); // At least 1 second
            expect(hook.timeout).toBeLessThan(60000);   // Less than 1 minute
          }
        });
      }
    });
  });
});

describe('Performance Optimizations', () => {
  test('Test cache directory is created', () => {
    // Run test hook to create cache
    execSync(`${TEST_HOOK} "" "fast" "dummy-file.ts"`, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    const cacheDir = path.join(__dirname, '..', 'test-cache');
    expect(fs.existsSync(cacheDir)).toBe(true);
  });

  test('Debouncer prevents rapid execution', () => {
    const start = Date.now();
    
    // First execution should work
    execSync(`${DEBOUNCER} "test-debounce" 1 "echo 'first'"`, { 
      encoding: 'utf8' 
    });
    
    // Second execution should be debounced
    const result = execSync(`${DEBOUNCER} "test-debounce" 1 "echo 'second'"`, { 
      encoding: 'utf8' 
    });
    
    expect(result).toContain('debounced');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000); // Should be very fast due to debouncing
  });
});