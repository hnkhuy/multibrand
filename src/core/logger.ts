export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export class Logger {
  constructor(private readonly scope: string) {}

  info(message: string): void {
    this.log('info', message);
  }

  warn(message: string): void {
    this.log('warn', message);
  }

  error(message: string): void {
    this.log('error', message);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      this.log('debug', message);
    }
  }

  private log(level: LogLevel, message: string): void {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.scope}]`;
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
  }
}

export function createLogger(scope: string): Logger {
  return new Logger(scope);
}
