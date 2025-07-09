const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const CONFIG_FILE = path.join(__dirname, '..', 'claude-code-hooks.json');
const CONFIG_MANAGER = path.join(__dirname, '..', 'hook-config-manager.js');

describe('Claude Code Hooks Configuration', () => {
  let originalConfig;

  beforeAll(() => {
    // Backup original config
    if (fs.existsSync(CONFIG_FILE)) {
      originalConfig = fs.readFileSync(CONFIG_FILE, 'utf8');
    }
  });

  afterAll(() => {
    // Restore original config
    if (originalConfig) {
      fs.writeFileSync(CONFIG_FILE, originalConfig);
    }
  });

  test('Configuration file exists and is valid JSON', () => {
    expect(fs.existsSync(CONFIG_FILE)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    expect(config).toHaveProperty('hooks');
    expect(config).toHaveProperty('config');
  });

  test('All required hook categories are defined', () => {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    
    expect(config.config.categories).toHaveProperty('formatting');
    expect(config.config.categories).toHaveProperty('testing');
    expect(config.config.categories).toHaveProperty('security');
    expect(config.config.categories).toHaveProperty('notifications');
  });

  test('Hook configuration manager can list hooks', () => {
    const output = execSync(`node ${CONFIG_MANAGER} list`, { encoding: 'utf8' });
    
    expect(output).toContain('Categories:');
    expect(output).toContain('Hooks:');
    expect(output).toContain('formatting');
  });

  test('Hook configuration manager can toggle hooks', () => {
    // Disable a hook
    execSync(`node ${CONFIG_MANAGER} disable format-on-save`);
    
    let config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const formatHook = config.hooks.PostToolUse[0].hooks.find(h => h.name === 'format-on-save');
    expect(formatHook.enabled).toBe(false);
    
    // Re-enable the hook
    execSync(`node ${CONFIG_MANAGER} enable format-on-save`);
    
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const reEnabledHook = config.hooks.PostToolUse[0].hooks.find(h => h.name === 'format-on-save');
    expect(reEnabledHook.enabled).toBe(true);
  });

  test('Environment-specific configs exist', () => {
    const devConfig = path.join(__dirname, '..', 'claude-code-hooks.development.json');
    const prodConfig = path.join(__dirname, '..', 'claude-code-hooks.production.json');
    
    expect(fs.existsSync(devConfig)).toBe(true);
    expect(fs.existsSync(prodConfig)).toBe(true);
  });

  test('Logger script is executable', () => {
    const loggerScript = path.join(__dirname, '..', 'hook-logger.sh');
    expect(fs.existsSync(loggerScript)).toBe(true);
    
    const stats = fs.statSync(loggerScript);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });

  test('Format hook script is executable', () => {
    const formatScript = path.join(__dirname, '..', 'format-hook.sh');
    expect(fs.existsSync(formatScript)).toBe(true);
    
    const stats = fs.statSync(formatScript);
    expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
  });
});

describe('Hook Logger Functionality', () => {
  const LOGGER_SCRIPT = path.join(__dirname, '..', 'hook-logger.sh');
  const LOG_FILE = path.join(__dirname, '..', 'hooks.log');

  test('Logger creates log entries', () => {
    execSync(`${LOGGER_SCRIPT} "Test log entry"`);
    
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    expect(logContent).toContain('Test log entry');
  });

  test('Logger supports different log levels', () => {
    execSync(`${LOGGER_SCRIPT} error "Test error"`);
    execSync(`${LOGGER_SCRIPT} debug "Test debug"`);
    
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    expect(logContent).toContain('[ERROR] Test error');
  });
});