/**
 * 🤖 AI-ENHANCED LOGGER
 * 
 * Smart logging system with:
 * - Pattern recognition for common errors
 * - Auto-fix suggestions using AI
 * - Learning from past issues
 * - Real-time diagnostics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════
// 📊 ERROR PATTERNS DATABASE
// ═══════════════════════════════════════════════════════════════

interface ErrorPattern {
  pattern: RegExp;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFix?: string;
  suggestion: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Navigation Errors
  {
    pattern: /navigation.*error|could not.*navigate|route.*not.*found/i,
    category: 'Navigation',
    severity: 'high',
    suggestion: 'Check if route file exists. Verify expo-router setup. Use correct path syntax.',
    autoFix: 'Try restarting app and clearing navigation cache'
  },
  
  // Network Errors
  {
    pattern: /network.*request.*failed|connection.*refused|timeout/i,
    category: 'Network',
    severity: 'critical',
    suggestion: 'Ensure phone and server on same WiFi. Check server is running. Verify firewall allows port.',
    autoFix: 'Test connection with health monitor'
  },
  
  // Permission Errors
  {
    pattern: /camera.*permission|permission.*denied/i,
    category: 'Permissions',
    severity: 'high',
    suggestion: 'Enable camera permission in device settings',
    autoFix: 'Request permissions again'
  },
  
  // Server Errors
  {
    pattern: /server.*error|500|502|503/i,
    category: 'Server',
    severity: 'critical',
    suggestion: 'Server encountered error. Check Python server logs. Restart server.',
    autoFix: 'Retry connection'
  },
  
  // Pairing Errors
  {
    pattern: /pairing.*failed|invalid.*code|authentication/i,
    category: 'Pairing',
    severity: 'high',
    suggestion: 'Verify pairing code matches. Ensure QR code is from Butler server. Regenerate QR.',
    autoFix: 'Scan QR code again'
  },
  
  // Module Errors
  {
    pattern: /module.*not.*found|cannot.*resolve/i,
    category: 'Module',
    severity: 'medium',
    suggestion: 'Missing dependency. Run: npm install',
    autoFix: 'Check package.json'
  },
];

// ═══════════════════════════════════════════════════════════════
// 🧠 AI LOGGER CLASS
// ═══════════════════════════════════════════════════════════════

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  data?: any;
  pattern?: ErrorPattern;
  autoFixApplied?: boolean;
}

class AILogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private learningData: Map<string, number> = new Map();

  // ═══════════════════════════════════════════════════════════
  // 📝 LOGGING METHODS
  // ═══════════════════════════════════════════════════════════

  info(message: string, data?: any) {
    this.log('info', 'General', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', 'Warning', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', 'Error', message, data);
    this.analyzeError(message, data);
  }

  success(message: string, data?: any) {
    this.log('success', 'Success', message, data);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔍 AI ERROR ANALYSIS
  // ═══════════════════════════════════════════════════════════

  private analyzeError(message: string, data?: any) {
    const fullMessage = `${message} ${JSON.stringify(data || {})}`;
    
    // Find matching pattern
    const matchedPattern = ERROR_PATTERNS.find(pattern => 
      pattern.pattern.test(fullMessage)
    );

    if (matchedPattern) {
      console.log(`\n🤖 AI ANALYSIS:`);
      console.log(`  Category: ${matchedPattern.category}`);
      console.log(`  Severity: ${matchedPattern.severity.toUpperCase()}`);
      console.log(`  💡 Suggestion: ${matchedPattern.suggestion}`);
      
      if (matchedPattern.autoFix) {
        console.log(`  🔧 Auto-Fix: ${matchedPattern.autoFix}`);
      }
      
      // Update learning data
      const key = matchedPattern.category;
      this.learningData.set(key, (this.learningData.get(key) || 0) + 1);
      
      return matchedPattern;
    }
    
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // 💾 CORE LOGGING
  // ═══════════════════════════════════════════════════════════

  private log(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Add to memory
    this.logs.push(entry);
    
    // Trim if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with colors
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
    }[level];

    console.log(`${emoji} [${category}] ${message}`, data || '');

    // Persist important logs
    if (level === 'error' || level === 'warn') {
      this.persistLog(entry);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💾 PERSISTENCE
  // ═══════════════════════════════════════════════════════════

  private async persistLog(entry: LogEntry) {
    try {
      const key = `@butler_log_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to persist log:', error);
    }
  }

  async getRecentLogs(limit = 50): Promise<LogEntry[]> {
    return this.logs.slice(-limit);
  }

  async getErrorStats() {
    const stats = Array.from(this.learningData.entries()).map(([category, count]) => ({
      category,
      count,
    }));
    
    return stats.sort((a, b) => b.count - a.count);
  }

  async clearLogs() {
    this.logs = [];
    this.learningData.clear();
    
    // Clear AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const logKeys = keys.filter(k => k.startsWith('@butler_log_'));
    await AsyncStorage.multiRemove(logKeys);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔬 DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════

  async getDiagnostics() {
    const recentErrors = this.logs.filter(l => l.level === 'error').slice(-10);
    const recentWarnings = this.logs.filter(l => l.level === 'warn').slice(-10);
    
    return {
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(l => l.level === 'error').length,
      warnCount: this.logs.filter(l => l.level === 'warn').length,
      recentErrors,
      recentWarnings,
      stats: await this.getErrorStats(),
      recommendations: this.getRecommendations(),
    };
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = Array.from(this.learningData.entries());
    
    stats.forEach(([category, count]) => {
      if (count > 5) {
        if (category === 'Network') {
          recommendations.push('🌐 High network errors detected. Check WiFi connection and server status.');
        }
        if (category === 'Navigation') {
          recommendations.push('🧭 Navigation issues detected. Try restarting the app.');
        }
        if (category === 'Permissions') {
          recommendations.push('🔐 Permission errors detected. Check app settings.');
        }
        if (category === 'Server') {
          recommendations.push('🖥️ Server errors detected. Restart Python server.');
        }
      }
    });
    
    return recommendations;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🌟 EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════

export const aiLogger = new AILogger();
