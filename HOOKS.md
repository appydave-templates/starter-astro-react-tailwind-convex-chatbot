# Claude Code Hooks Documentation

This document explains how to use and configure Claude Code hooks for the AI-Accelerated Starter Template project.

## Overview

Claude Code hooks are user-defined shell commands that execute at specific points in Claude Code's lifecycle, providing automated code quality checks, workflow automation, and development feedback.

## Quick Start

The hooks system is already configured and ready to use. The main configuration file is located at `.claude/claude-code-hooks.json`.

### Available Hooks

1. **Formatting Hooks** - Automatically format code after edits
2. **Security Hooks** - Warn when modifying sensitive files
3. **Notification Hooks** - Provide feedback for builds and tests
4. **Cleanup Hooks** - Clean temporary files on session end

## Configuration Structure

```json
{
  "hooks": {
    "PostToolUse": [...],    // Runs after tool execution
    "PreToolUse": [...],     // Runs before tool execution
    "Notification": [...],   // Custom notifications
    "Stop": [...]           // Cleanup on session end
  },
  "config": {
    "debug": false,          // Enable verbose logging
    "logFile": ".claude/hooks.log",
    "categories": {
      "formatting": { "enabled": true },
      "testing": { "enabled": true },
      "security": { "enabled": true },
      "notifications": { "enabled": true }
    }
  }
}
```

## Managing Hooks

### Using the Configuration Manager

The `.claude/hook-config-manager.js` utility helps manage hook configurations:

```bash
# List all hooks and their status
node .claude/hook-config-manager.js list

# Enable/disable specific hooks
node .claude/hook-config-manager.js enable format-on-save
node .claude/hook-config-manager.js disable sensitive-file-warning

# Enable/disable entire categories
node .claude/hook-config-manager.js enable-category formatting
node .claude/hook-config-manager.js disable-category notifications

# Set hook timeouts
node .claude/hook-config-manager.js set-timeout format-on-save 10000
```

### Environment-Specific Configurations

- **Development**: `.claude/claude-code-hooks.development.json` (debug enabled)
- **Production**: `.claude/claude-code-hooks.production.json` (minimal hooks)

## Common Use Cases

### 1. Auto-Format on Save

```json
{
  "matcher": "Edit|Write|MultiEdit",
  "hooks": [{
    "type": "command",
    "command": "/path/to/.claude/format-hook.sh {workspace}",
    "timeout": 5000,
    "enabled": true,
    "name": "format-on-save"
  }]
}
```

### 2. Protect Sensitive Files

```json
{
  "matcher": "Edit|Write",
  "pattern": "**/.env*|**/secrets/**",
  "hooks": [{
    "type": "command",
    "command": "echo 'WARNING: Modifying sensitive file'",
    "blockExecution": false,
    "enabled": true,
    "name": "sensitive-file-warning"
  }]
}
```

### 3. Test Before Edit

```json
{
  "matcher": "Edit|Write",
  "hooks": [{
    "type": "command",
    "command": "turbo run test --affected",
    "blockOnFailure": true,
    "enabled": true,
    "name": "test-before-edit"
  }]
}
```

## Performance Monitoring

### View Hook Performance

```bash
# Generate performance report
node .claude/hook-performance-report.js
```

This shows:
- Execution counts per hook
- Average, min, and max execution times
- Slow executions (>5 seconds)
- Errors and warnings

### Debug Mode

Enable debug mode to see real-time hook execution:

```bash
# Edit .claude/claude-code-hooks.json
"config": {
  "debug": true
}
```

## Troubleshooting

### Hook Not Executing

1. Check if the hook is enabled:
   ```bash
   node .claude/hook-config-manager.js list
   ```

2. Verify the hook matcher pattern matches your tool usage

3. Check the log file for errors:
   ```bash
   tail -f .claude/hooks.log
   ```

### Hook Timing Out

Increase the timeout value:
```bash
node .claude/hook-config-manager.js set-timeout hook-name 10000
```

### Disable All Hooks

To temporarily disable all hooks, rename the configuration file:
```bash
mv .claude/claude-code-hooks.json .claude/claude-code-hooks.json.disabled
```

### View Hook Logs

```bash
# View recent logs
tail -20 .claude/hooks.log

# View errors only
grep ERROR .claude/hooks.log

# Monitor logs in real-time
tail -f .claude/hooks.log
```

## Advanced Configuration

### Custom Hook Scripts

Create custom scripts in `.claude/` directory:

```bash
#!/bin/bash
# .claude/my-custom-hook.sh

source /path/to/.claude/hook-logger.sh

log_message "INFO" "Running custom hook"
# Your custom logic here
```

### Hook Variables

Available variables in hook commands:
- `{workspace}` - Current workspace context
- `{file}` - File being modified (when applicable)

### Hook Priority

Hooks execute in the order they appear in the configuration. Reorder hooks in the JSON file to change execution priority.

## Best Practices

1. **Keep hooks fast** - Aim for <2 second execution time
2. **Use categories** - Group related hooks for easy management
3. **Log important events** - Use the logging infrastructure
4. **Test hooks locally** - Verify behavior before enabling
5. **Monitor performance** - Regularly check execution times
6. **Use bypass wisely** - Only disable hooks when necessary

## Security Considerations

- Hooks run with full user permissions
- Always validate hook commands before enabling
- Use `blockExecution: true` carefully to avoid blocking legitimate work
- Keep sensitive patterns updated in security hooks

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the log files in `.claude/`
3. Verify hook configuration syntax
4. Test hook commands manually in terminal

Remember: You can always disable problematic hooks using the configuration manager without affecting other hooks.