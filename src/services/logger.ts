import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private logLevel: LogLevel;
  private logFile: string;
  private writeStream: fs.WriteStream | null = null;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    
    // Create logs directory in user data
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create log file with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    this.logFile = path.join(logsDir, `aurix-${timestamp}.log`);
    
    // Initialize write stream
    this.writeStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    
    // Clean up old logs (keep last 7 days)
    this.cleanupOldLogs(logsDir);
  }

  private cleanupOldLogs(logsDir: string) {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    fs.readdir(logsDir, (err, files) => {
      if (err) return;
      
      files.forEach(file => {
        if (file.startsWith('aurix-') && file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          fs.stat(filePath, (statErr, stats) => {
            if (!statErr && stats.mtimeMs < sevenDaysAgo) {
              fs.unlink(filePath, unlinkErr => {
                if (unlinkErr) console.error('Failed to delete old log:', unlinkErr);
              });
            }
          });
        }
      });
    });
  }

  private formatMessage(level: string, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}\n`;
  }

  private writeLog(level: LogLevel, levelStr: string, message: string, context?: Record<string, unknown>) {
    if (level > this.logLevel) return;
    
    const formattedMessage = this.formatMessage(levelStr, message, context);
    
    // Write to console in development
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }
    
    // Write to file
    if (this.writeStream) {
      this.writeStream.write(formattedMessage);
    }
  }

  error(message: string, context?: Record<string, unknown>) {
    this.writeLog(LogLevel.ERROR, 'ERROR', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.writeLog(LogLevel.WARN, 'WARN', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.writeLog(LogLevel.INFO, 'INFO', message, context);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.writeLog(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  close() {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Ensure cleanup on app quit
app.on('before-quit', () => {
  logger.close();
});