const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const SECURITY_HOOK = path.join(__dirname, '..', 'security-hook.sh');
const NOTIFICATION_HOOK = path.join(__dirname, '..', 'notification-hook.sh');
const CLEANUP_HOOK = path.join(__dirname, '..', 'cleanup-hook.sh');
const BYPASS_UTILITY = path.join(__dirname, '..', 'hook-bypass.sh');

describe('Security Hooks', () => {
  test('Security hook script is executable', () => {
    expect(fs.existsSync(SECURITY_HOOK)).toBe(true);
    
    const stats = fs.statSync(SECURITY_HOOK);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Security hook can scan files', () => {
    // Create a test file without credentials
    const testFile = path.join(__dirname, 'test-clean.js');
    fs.writeFileSync(testFile, 'const message = "Hello World";\nconsole.log(message);');
    
    try {
      const result = execSync(`${SECURITY_HOOK} "${testFile}" scan`, { 
        encoding: 'utf8',
        timeout: 5000 
      });
      
      expect(result).toContain('No credentials detected');
    } finally {
      fs.unlinkSync(testFile);
    }
  });

  test('Security hook detects credentials', () => {
    // Create a test file with potential credentials
    const testFile = path.join(__dirname, 'test-credentials.js');
    fs.writeFileSync(testFile, 'const apiKey = "sk-1234567890abcdef";\nconst password = "secret123";');
    
    try {
      let result;
      let exitCode = 0;
      
      try {
        result = execSync(`${SECURITY_HOOK} "${testFile}" scan`, { 
          encoding: 'utf8',
          timeout: 5000 
        });
      } catch (error) {
        result = error.stdout;
        exitCode = error.status;
      }
      
      expect(result).toContain('credential pattern detected');
      expect(exitCode).toBe(1); // Should fail when credentials detected
    } finally {
      fs.unlinkSync(testFile);
    }
  });

  test('Security hook protects sensitive files', () => {
    const result = execSync(`${SECURITY_HOOK} ".env.local" protect warn`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(result).toContain('WARNING');
    expect(result).toContain('sensitive file');
  });

  test('Security audit log is created', () => {
    const auditFile = path.join(__dirname, '..', 'security-audit.log');
    
    // Run a security check to generate audit entry
    execSync(`${SECURITY_HOOK} "test.env" protect log`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(fs.existsSync(auditFile)).toBe(true);
    
    const auditContent = fs.readFileSync(auditFile, 'utf8');
    expect(auditContent).toContain('test.env');
  });
});

describe('Notification Hooks', () => {
  test('Notification hook script is executable', () => {
    expect(fs.existsSync(NOTIFICATION_HOOK)).toBe(true);
    
    const stats = fs.statSync(NOTIFICATION_HOOK);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Console notifications work', () => {
    const result = execSync(`${NOTIFICATION_HOOK} "test-event" "Test message" "success" "console"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(result).toContain('✅');
    expect(result).toContain('Test message');
  });

  test('File notifications are saved', () => {
    const notificationFile = path.join(__dirname, '..', 'notifications.log');
    
    execSync(`${NOTIFICATION_HOOK} "test-event" "File notification test" "info" "file"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(fs.existsSync(notificationFile)).toBe(true);
    
    const notificationContent = fs.readFileSync(notificationFile, 'utf8');
    expect(notificationContent).toContain('File notification test');
  });

  test('Notification templates work', () => {
    const result = execSync(`${NOTIFICATION_HOOK} "build-success" "" "success" "console"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(result).toContain('Build completed successfully');
  });
});

describe('Cleanup Hooks', () => {
  test('Cleanup hook script is executable', () => {
    expect(fs.existsSync(CLEANUP_HOOK)).toBe(true);
    
    const stats = fs.statSync(CLEANUP_HOOK);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Session cleanup works', () => {
    // Create test temporary files
    const tempDir = path.join(__dirname, '..', '..', '.tmp');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'test.tmp'), 'temporary file');
    
    const result = execSync(`${CLEANUP_HOOK} session`, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    expect(result).toContain('session cleanup');
    // Note: temp directory might not be removed if files are recent
  });

  test('Log rotation works', () => {
    const result = execSync(`${CLEANUP_HOOK} logs`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(result).toContain('Rotating log files');
  });
});

describe('Bypass System', () => {
  test('Bypass utility is executable', () => {
    expect(fs.existsSync(BYPASS_UTILITY)).toBe(true);
    
    const stats = fs.statSync(BYPASS_UTILITY);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Bypass status shows correctly', () => {
    const result = execSync(`${BYPASS_UTILITY} status`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    expect(result).toContain('Hook Bypass Status');
    expect(result).toContain('Global bypass');
  });

  test('Can enable and disable bypass', () => {
    // Enable bypass
    let result = execSync(`${BYPASS_UTILITY} enable all "Test bypass"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    expect(result).toContain('ENABLED');
    
    // Check status
    result = execSync(`${BYPASS_UTILITY} status`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    expect(result).toContain('ACTIVE');
    
    // Disable bypass
    result = execSync(`${BYPASS_UTILITY} disable all "Test complete"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    expect(result).toContain('DISABLED');
  });

  test('Emergency bypass works', () => {
    // Activate emergency bypass
    let result = execSync(`${BYPASS_UTILITY} enable emergency "Test emergency"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    expect(result).toContain('EMERGENCY');
    
    // Check emergency file exists
    const emergencyFile = path.join(__dirname, '..', '.emergency-bypass');
    expect(fs.existsSync(emergencyFile)).toBe(true);
    
    // Deactivate emergency bypass
    result = execSync(`${BYPASS_UTILITY} disable emergency "Emergency test complete"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    expect(result).toContain('DEACTIVATED');
    
    // Check emergency file is removed
    expect(fs.existsSync(emergencyFile)).toBe(false);
  });
});

describe('Hook Configuration Integration', () => {
  test('Security hooks are configured', () => {
    const configFile = path.join(__dirname, '..', 'claude-code-hooks.json');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    // Check security hooks in PreToolUse
    const securityHooks = config.hooks.PreToolUse.filter(group => 
      group.hooks && group.hooks.some(h => h.name.includes('security') || h.name.includes('sensitive'))
    );
    expect(securityHooks.length).toBeGreaterThan(0);
    
    // Check credential scanner
    const credentialHooks = config.hooks.PreToolUse.filter(group => 
      group.hooks && group.hooks.some(h => h.name === 'credential-scanner')
    );
    expect(credentialHooks.length).toBeGreaterThan(0);
  });

  test('Notification hooks are configured', () => {
    const configFile = path.join(__dirname, '..', 'claude-code-hooks.json');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    // Check notification hooks
    expect(config.hooks.Notification).toBeDefined();
    expect(config.hooks.Notification.length).toBeGreaterThan(0);
    
    // Check security notification
    const securityNotifications = config.hooks.Notification.filter(group => 
      group.hooks && group.hooks.some(h => h.name === 'security-notification')
    );
    expect(securityNotifications.length).toBeGreaterThan(0);
  });

  test('Cleanup hooks are configured', () => {
    const configFile = path.join(__dirname, '..', 'claude-code-hooks.json');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    // Check Stop hooks
    expect(config.hooks.Stop).toBeDefined();
    expect(config.hooks.Stop.length).toBeGreaterThan(0);
    
    // Check SubagentStop hooks
    expect(config.hooks.SubagentStop).toBeDefined();
    expect(config.hooks.SubagentStop.length).toBeGreaterThan(0);
  });
});