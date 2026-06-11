/**
 * Health Check Service
 * Performs comprehensive diagnostics and logs results
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// ⚠️ CRITICAL: Do NOT import NetInfo at top level - it causes Android TooManyRequestsException
// NetInfo will be lazy-loaded only when needed to avoid module initialization race

const HEALTH_CHECK_LOGS_KEY = 'commandcube_health_logs';
const MAX_LOGS = 50;

// STRICT NETWORK LIMITS to prevent Android crashes
const NETWORK_CHECK_TIMEOUT = 5000; // 5 seconds max for network operations
const MAX_NETWORK_CHECKS_PER_MINUTE = 5; // Hard limit
let networkCheckCount = 0;
let networkCheckResetTime = Date.now();

export interface HealthCheckResult {
  timestamp: string;
  overall: 'healthy' | 'warning' | 'critical';
  checks: {
    network: CheckStatus;
    server: CheckStatus;
    storage: CheckStatus;
    settings: CheckStatus;
  };
  details: string[];
  recommendations: string[];
}

export interface CheckStatus {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  responseTime?: number;
}

class HealthCheckService {
  /**
   * Perform comprehensive health check with enhanced diagnostics
   */
  async performHealthCheck(serverIP?: string, serverPort?: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const details: string[] = [];
    const recommendations: string[] = [];

    console.log('[HealthCheck] Starting comprehensive diagnostics...');

    // 1. Network Check with detailed logging
    console.log('[HealthCheck] Testing network connectivity...');
    const networkCheck = await this.checkNetwork();
    details.push(`Network: ${networkCheck.message}`);
    console.log(`[HealthCheck] Network: ${networkCheck.status} - ${networkCheck.message}`);
    
    if (networkCheck.status === 'fail') {
      recommendations.push('⚠ Connect to WiFi or cellular network');
      console.warn('[HealthCheck] Network connectivity issue detected');
    } else if (networkCheck.status === 'warning') {
      recommendations.push('💡 WiFi recommended for faster connection');
    }

    // 2. Server Check with detailed logging (if credentials provided)
    let serverCheck: CheckStatus;
    if (serverIP && serverPort) {
      console.log(`[HealthCheck] Testing server at ${serverIP}:${serverPort}...`);
      serverCheck = await this.checkServer(serverIP, serverPort);
      details.push(`Server: ${serverCheck.message}`);
      
      if (serverCheck.responseTime) {
        console.log(`[HealthCheck] Server response time: ${serverCheck.responseTime}ms`);
      }
      
      if (serverCheck.status === 'fail') {
        recommendations.push('🔴 Ensure Python server is running on your PC');
        recommendations.push('🔥 Check firewall/antivirus settings');
        recommendations.push('🔍 Verify IP address and port are correct');
        console.error('[HealthCheck] Server connection failed');
      } else if (serverCheck.status === 'pass' && serverCheck.responseTime && serverCheck.responseTime > 1000) {
        recommendations.push('⚡ Server responding slowly (>1s)');
      }
    } else {
      serverCheck = {
        status: 'warning',
        message: 'No server configured',
      };
      details.push('Server: Not configured');
      recommendations.push('⚙ Configure server in Home tab or tap SCAN');
      console.log('[HealthCheck] No server configured for testing');
    }

    // 3. Storage Check with logging
    console.log('[HealthCheck] Testing local storage...');
    const storageCheck = await this.checkStorage();
    details.push(`Storage: ${storageCheck.message}`);
    console.log(`[HealthCheck] Storage: ${storageCheck.status} - ${storageCheck.message}`);
    
    if (storageCheck.status === 'fail') {
      recommendations.push('💾 Clear app cache or free up device storage');
      console.error('[HealthCheck] Storage error detected');
    }

    // 4. Settings Check with logging
    console.log('[HealthCheck] Verifying app settings...');
    const settingsCheck = await this.checkSettings();
    details.push(`Settings: ${settingsCheck.message}`);
    console.log(`[HealthCheck] Settings: ${settingsCheck.status} - ${settingsCheck.message}`);

    if (settingsCheck.status === 'warning') {
      recommendations.push('⚙ Review settings in Settings tab');
    }

    // 5. Performance Metrics
    const totalTime = Date.now() - startTime;
    details.push(`Health check completed in ${totalTime}ms`);
    console.log(`[HealthCheck] Diagnostics completed in ${totalTime}ms`);

    // Determine overall health
    const checks = {
      network: networkCheck,
      server: serverCheck,
      storage: storageCheck,
      settings: settingsCheck,
    };

    const hasFailure = Object.values(checks).some(c => c.status === 'fail');
    const hasWarning = Object.values(checks).some(c => c.status === 'warning');

    const overall: 'healthy' | 'warning' | 'critical' = 
      hasFailure ? 'critical' : hasWarning ? 'warning' : 'healthy';

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      overall,
      checks,
      details,
      recommendations: recommendations.length > 0 ? recommendations : ['✓ All systems operational - No issues detected'],
    };

    // Save to logs
    await this.saveLog(result);
    
    console.log(`[HealthCheck] Overall status: ${result.overall.toUpperCase()}`);
    console.log('[HealthCheck] Diagnostics saved to logs');

    return result;
  }

  /**
   * Check network connectivity using pure fetch API (NO NetInfo to avoid Android crash)
   */
  private async checkNetwork(): Promise<CheckStatus> {
    // RATE LIMITING: Prevent too many network checks
    const now = Date.now();
    if (now - networkCheckResetTime > 60000) {
      // Reset counter every minute
      networkCheckCount = 0;
      networkCheckResetTime = now;
    }
    
    if (networkCheckCount >= MAX_NETWORK_CHECKS_PER_MINUTE) {
      console.warn('[HealthCheck] Network check rate limit reached, skipping');
      return {
        status: 'warning',
        message: 'Network check skipped (rate limited)',
      };
    }
    
    networkCheckCount++;
    console.log(`[HealthCheck] Network check ${networkCheckCount}/${MAX_NETWORK_CHECKS_PER_MINUTE}`);
    
    try {
      // ⚠️ DO NOT USE NetInfo - it causes Android ConnectivityManager$TooManyRequestsException
      // Instead, use a simple fetch to a reliable endpoint to test connectivity
      console.log('[HealthCheck] Testing network with fetch API (NetInfo disabled to prevent Android crash)');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), NETWORK_CHECK_TIMEOUT);
      
      const startTime = Date.now();
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      
      if (response.ok || response.status === 204) {
        console.log(`[HealthCheck] Network: Connected (${responseTime}ms)`);
        return {
          status: 'pass',
          message: `Network connected (${responseTime}ms)`,
          responseTime,
        };
      }
      
      console.warn('[HealthCheck] Network: Unexpected response status', response.status);
      return {
        status: 'warning',
        message: `Network available but limited (HTTP ${response.status})`,
        responseTime,
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error('[HealthCheck] Network check error:', errorMsg);
      
      // If fetch fails, network is likely down
      if (errorMsg.includes('AbortError') || errorMsg.includes('timeout')) {
        return {
          status: 'fail',
          message: 'No network connection (timeout)',
        };
      }
      
      if (errorMsg.includes('Network request failed')) {
        return {
          status: 'fail',
          message: 'No network connection detected',
        };
      }
      
      return {
        status: 'warning',
        message: `Network check uncertain: ${errorMsg}`,
      };
    }
  }

  /**
   * Check server connectivity with detailed diagnostics
   */
  private async checkServer(ip: string, port: string): Promise<CheckStatus> {
    const startTime = Date.now();
    
    try {
      console.log(`[HealthCheck] Connecting to http://${ip}:${port}/api/status`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.warn('[HealthCheck] Server request timeout (5s)');
        controller.abort();
      }, 5000);
      
      const response = await fetch(`http://${ip}:${port}/api/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      
      console.log(`[HealthCheck] Server responded with status ${response.status} in ${responseTime}ms`);

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'online') {
          let message = `Server online (${responseTime}ms)`;
          
          // Add performance warning for slow responses
          if (responseTime > 2000) {
            message += ' - Slow response';
            console.warn(`[HealthCheck] Server slow: ${responseTime}ms`);
          } else if (responseTime < 100) {
            message += ' - Excellent';
          }
          
          // Include version if available
          if (data.version) {
            message += ` v${data.version}`;
            console.log(`[HealthCheck] Server version: ${data.version}`);
          }
          
          return {
            status: 'pass',
            message,
            responseTime,
          };
        }
      }

      console.error(`[HealthCheck] Server returned invalid status: ${response.status}`);
      return {
        status: 'fail',
        message: `Server error (HTTP ${response.status})`,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if ((error as Error).name === 'AbortError') {
        console.error('[HealthCheck] Server timeout');
        return {
          status: 'fail',
          message: 'Connection timeout (>5s) - Check if server is running',
          responseTime,
        };
      }

      // Network errors
      const errorMsg = (error as Error).message;
      console.error(`[HealthCheck] Server connection failed: ${errorMsg}`);
      
      let message = 'Cannot reach server';
      if (errorMsg.includes('Network request failed')) {
        message += ' - Check firewall or server IP';
      } else if (errorMsg.includes('ECONNREFUSED')) {
        message += ' - Connection refused (wrong port?)';
      } else {
        message += `: ${errorMsg}`;
      }

      return {
        status: 'fail',
        message,
        responseTime,
      };
    }
  }

  /**
   * Check local storage health with detailed metrics
   */
  private async checkStorage(): Promise<CheckStatus> {
    try {
      // Test write/read cycle
      const testKey = '__health_check_test__';
      const testValue = Date.now().toString();
      
      console.log('[HealthCheck] Testing storage write/read...');
      const writeStart = Date.now();
      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      const storageTime = Date.now() - writeStart;

      if (retrieved !== testValue) {
        console.error('[HealthCheck] Storage integrity check failed');
        return {
          status: 'fail',
          message: 'Storage read/write mismatch - Data corruption possible',
        };
      }

      // Check storage usage (get all keys)
      const keys = await AsyncStorage.getAllKeys();
      console.log(`[HealthCheck] Storage contains ${keys.length} keys (${storageTime}ms)`);
      
      let message = `Storage healthy (${keys.length} items`;
      
      // Warn if storage operation was slow
      if (storageTime > 500) {
        message += `, slow I/O: ${storageTime}ms)`;
        console.warn(`[HealthCheck] Slow storage performance: ${storageTime}ms`);
        return {
          status: 'warning',
          message,
        };
      }
      
      message += ')';
      
      return {
        status: 'pass',
        message,
      };
    } catch (error) {
      console.error('[HealthCheck] Storage check failed:', error);
      return {
        status: 'fail',
        message: `Storage error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check settings integrity
   */
  private async checkSettings(): Promise<CheckStatus> {
    try {
      const requiredKeys = [
        'commandcube_autoconnect',
        'commandcube_save_history',
      ];

      const values = await AsyncStorage.multiGet(requiredKeys);
      const missingKeys = values.filter(([, v]) => v === null);

      if (missingKeys.length > 0) {
        return {
          status: 'warning',
          message: `${missingKeys.length} settings need initialization`,
        };
      }

      return {
        status: 'pass',
        message: 'All settings configured',
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Settings check failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Save health check log
   */
  private async saveLog(result: HealthCheckResult): Promise<void> {
    try {
      const logs = await this.getLogs();
      logs.unshift(result);
      
      // Limit to MAX_LOGS
      if (logs.length > MAX_LOGS) {
        logs.splice(MAX_LOGS);
      }

      await AsyncStorage.setItem(HEALTH_CHECK_LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save health check log:', error);
    }
  }

  /**
   * Get all health check logs
   */
  async getLogs(): Promise<HealthCheckResult[]> {
    try {
      const data = await AsyncStorage.getItem(HEALTH_CHECK_LOGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load health check logs:', error);
    }
    
    return [];
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HEALTH_CHECK_LOGS_KEY);
    } catch (error) {
      console.error('Failed to clear health check logs:', error);
    }
  }

  /**
   * Export logs as text
   */
  async exportLogsAsText(): Promise<string> {
    const logs = await this.getLogs();
    
    let text = '╔═══════════════════════════════════════╗\n';
    text += '║   COMMANDCUBE HEALTH CHECK LOGS       ║\n';
    text += '╚═══════════════════════════════════════╝\n\n';

    logs.forEach((log, index) => {
      const date = new Date(log.timestamp);
      text += `[${ (index + 1).toString().padStart(2, '0')}] ${date.toLocaleString()}\n`;
      text += `Status: ${log.overall.toUpperCase()}\n`;
      text += `\nChecks:\n`;
      Object.entries(log.checks).forEach(([name, check]) => {
        text += `  ${name}: [${check.status.toUpperCase()}] ${check.message}\n`;
      });
      text += `\nDetails:\n`;
      log.details.forEach(detail => text += `  - ${detail}\n`);
      text += `\nRecommendations:\n`;
      log.recommendations.forEach(rec => text += `  • ${rec}\n`);
      text += '\n' + '─'.repeat(40) + '\n\n';
    });

    return text;
  }

  /**
   * Get health statistics
   */
  async getStats(): Promise<{
    totalChecks: number;
    healthy: number;
    warnings: number;
    critical: number;
    lastCheck: string | null;
  }> {
    const logs = await this.getLogs();
    
    return {
      totalChecks: logs.length,
      healthy: logs.filter(l => l.overall === 'healthy').length,
      warnings: logs.filter(l => l.overall === 'warning').length,
      critical: logs.filter(l => l.overall === 'critical').length,
      lastCheck: logs.length > 0 ? logs[0].timestamp : null,
    };
  }
}

export const healthCheckService = new HealthCheckService();
