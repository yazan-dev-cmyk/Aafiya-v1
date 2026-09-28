type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  context?: string;
  data?: Record<string, unknown>;
}

class Logger {
  private formatMessage(level: LogLevel, payload: LogPayload): string {
    const timestamp = new Date().toISOString();
    const ctx = payload.context ? `[${payload.context}]` : '[SYSTEM]';
    return `${timestamp} ${level.toUpperCase()} ${ctx}: ${payload.message}`;
  }

  info(payload: LogPayload) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(this.formatMessage('info', payload), payload.data || '');
    }
  }

  warn(payload: LogPayload) {
    console.warn(this.formatMessage('warn', payload), payload.data || '');
  }

  error(payload: LogPayload) {
    console.error(this.formatMessage('error', payload), payload.data || '');
  }

  debug(payload: LogPayload) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', payload), payload.data || '');
    }
  }
}

export const logger = new Logger();
