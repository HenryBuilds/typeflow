import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Centralized logger for Typeflow server-side code.
 * Uses pino for fast, structured logging.
 * 
 * Log levels (from most to least verbose):
 * - trace: Very detailed debugging
 * - debug: Debugging information
 * - info: General information
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Critical errors
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('Server started');
 * logger.debug({ userId: '123' }, 'User logged in');
 * logger.error({ err }, 'Failed to process request');
 * ```
 */
export const logger = pino({
  level: LOG_LEVEL,
  transport: process.env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Create a child logger with a specific module name.
 * This is useful for identifying which part of the code generated a log.
 * 
 * Usage:
 * ```typescript
 * const log = createLogger('NodeLoader');
 * log.info('Loading nodes...');
 * ```
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

export default logger;
