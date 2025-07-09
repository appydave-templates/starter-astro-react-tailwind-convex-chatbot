#!/bin/bash

# Claude Code security hook script
# Handles sensitive file protection and credential scanning

set -e

# Source the logger
source /Users/toc/Server/ONEd/.claude/hook-logger.sh

# Configuration
FILE_PATH="${1:-}"
MODE="${2:-protect}"  # protect, scan, or audit
ACTION="${3:-warn}"   # warn, block, or log

# Security patterns and files
SENSITIVE_PATTERNS=(
  "**/.env*"
  "**/secrets/**"
  "**/*key*"
  "**/*token*"
  "**/*password*"
  "**/*secret*"
  "**/credentials/**"
  "**/.ssh/**"
  "**/cert*"
  "**/*.pem"
  "**/*.p12"
  "**/*.pfx"
  "**/config/database.*"
  "**/convex/.env*"
)

CREDENTIAL_PATTERNS=(
  "api[_-]?key[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9_-]{16,}['\"]?"
  "secret[_-]?key[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9_-]{16,}['\"]?"
  "access[_-]?token[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9_.-]{16,}['\"]?"
  "password[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9!@#$%^&*()_+-=]{8,}['\"]?"
  "database[_-]?url[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9_:/@.-]+['\"]?"
  "mongodb[_-]?uri[s]?\s*[:=]\s*['\"]?mongodb://[a-zA-Z0-9_:/@.-]+['\"]?"
  "jwt[_-]?secret[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9_.-]{16,}['\"]?"
  "private[_-]?key[s]?\s*[:=]\s*['\"]?-----BEGIN.*-----['\"]?"
  "convex[_-]?deploy[_-]?key[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9_.-]{32,}['\"]?"
  "better[_-]?auth[_-]?secret[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9_.-]{16,}['\"]?"
)

# Log start
log_message "INFO" "Starting security-hook for file: ${FILE_PATH:-unknown}, mode: $MODE, action: $ACTION"
START_TIME=$(get_time_ms)

# Function to check if file matches sensitive patterns
is_sensitive_file() {
  local file="$1"
  
  for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    # Convert glob pattern to regex for basic matching
    local regex=$(echo "$pattern" | sed 's/\*\*/.*/' | sed 's/\*/[^\/]*/')
    if [[ "$file" =~ $regex ]]; then
      return 0
    fi
  done
  return 1
}

# Function to scan file content for credentials
scan_credentials() {
  local file="$1"
  local findings=()
  
  if [ ! -f "$file" ]; then
    return 0
  fi
  
  for pattern in "${CREDENTIAL_PATTERNS[@]}"; do
    local matches=$(grep -E "$pattern" "$file" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      local line_num=$(grep -n -E "$pattern" "$file" | cut -d: -f1 | head -1)
      findings+=("Line $line_num: Potential credential pattern detected")
      log_message "WARN" "Credential pattern detected in $file at line $line_num"
    fi
  done
  
  if [ ${#findings[@]} -gt 0 ]; then
    echo "🔒 Security scan findings in $file:"
    printf '%s\n' "${findings[@]}"
    return 1
  fi
  
  return 0
}

# Function to create audit entry
create_audit_entry() {
  local file="$1"
  local event="$2"
  local action="$3"
  
  local audit_file="/Users/toc/Server/ONEd/.claude/security-audit.log"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo "[$timestamp] EVENT: $event | FILE: $file | ACTION: $action" >> "$audit_file"
  log_message "INFO" "Audit entry created: $event for $file"
}

EXIT_CODE=0

case "$MODE" in
  "protect")
    if [ -n "$FILE_PATH" ] && is_sensitive_file "$FILE_PATH"; then
      case "$ACTION" in
        "block")
          echo "🚫 BLOCKED: Modification of sensitive file '$FILE_PATH' is not allowed"
          log_message "ERROR" "Blocked modification of sensitive file: $FILE_PATH"
          create_audit_entry "$FILE_PATH" "MODIFICATION_BLOCKED" "$ACTION"
          EXIT_CODE=1
          ;;
        "warn")
          echo "⚠️  WARNING: You are modifying a sensitive file '$FILE_PATH'"
          echo "   Please ensure no secrets are being committed."
          log_message "WARN" "Warning issued for sensitive file modification: $FILE_PATH"
          create_audit_entry "$FILE_PATH" "MODIFICATION_WARNING" "$ACTION"
          ;;
        "log")
          log_message "INFO" "Sensitive file modification logged: $FILE_PATH"
          create_audit_entry "$FILE_PATH" "MODIFICATION_LOGGED" "$ACTION"
          ;;
      esac
    else
      log_message "INFO" "File is not classified as sensitive: $FILE_PATH"
    fi
    ;;
    
  "scan")
    if [ -n "$FILE_PATH" ]; then
      echo "🔍 Scanning $FILE_PATH for potential credentials..."
      if ! scan_credentials "$FILE_PATH"; then
        create_audit_entry "$FILE_PATH" "CREDENTIAL_SCAN_FAILED" "$ACTION"
        if [ "$ACTION" = "block" ]; then
          EXIT_CODE=1
        fi
      else
        echo "✅ No credentials detected in $FILE_PATH"
        create_audit_entry "$FILE_PATH" "CREDENTIAL_SCAN_PASSED" "$ACTION"
      fi
    else
      echo "❌ No file specified for scanning"
      EXIT_CODE=1
    fi
    ;;
    
  "audit")
    echo "📋 Security audit summary:"
    local audit_file="/Users/toc/Server/ONEd/.claude/security-audit.log"
    
    if [ -f "$audit_file" ]; then
      echo "Recent security events:"
      tail -10 "$audit_file" | while IFS= read -r line; do
        echo "  $line"
      done
      
      echo ""
      echo "Event summary (last 24 hours):"
      local today=$(date '+%Y-%m-%d')
      local blocks=$(grep -c "MODIFICATION_BLOCKED" "$audit_file" 2>/dev/null || echo 0)
      local warnings=$(grep -c "MODIFICATION_WARNING" "$audit_file" 2>/dev/null || echo 0)
      local scans=$(grep -c "CREDENTIAL_SCAN" "$audit_file" 2>/dev/null || echo 0)
      
      echo "  - Blocked modifications: $blocks"
      echo "  - Warnings issued: $warnings"
      echo "  - Credential scans: $scans"
    else
      echo "No audit log found."
    fi
    ;;
    
  *)
    echo "❌ Unknown security mode: $MODE"
    log_message "ERROR" "Unknown security mode: $MODE"
    EXIT_CODE=1
    ;;
esac

# Log completion
END_TIME=$(get_time_ms)
log_hook_execution "security-hook" "$0 $*" "$START_TIME" "$END_TIME" "$EXIT_CODE"

exit $EXIT_CODE