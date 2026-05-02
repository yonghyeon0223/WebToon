import { randomBytes } from 'node:crypto';
import { pino, type DestinationStream, type Level, type Logger } from 'pino';
import { config } from './config.js';

/**
 * Factory: create a configured pino logger.
 *
 * Production code uses the cached `logger` export. Tests construct their own
 * via this factory with a custom destination to capture output.
 *
 * The `transport` option (pino-pretty) and a custom `destination` are mutually
 * exclusive in pino: when isDev=true we use the pretty transport; otherwise
 * we write raw JSON to either the provided destination or stderr (pino default).
 */
export function createLogger(opts: {
  level: Level;
  isDev: boolean;
  destination?: DestinationStream;
}): Logger {
  if (opts.isDev) {
    return pino({
      level: opts.level,
      transport: { target: 'pino-pretty', options: { colorize: true } },
    });
  }
  return opts.destination ? pino({ level: opts.level }, opts.destination) : pino({ level: opts.level });
}

/**
 * Cached root logger for production use. Configured from `config` at import time.
 */
export const logger: Logger = createLogger({
  level: config.LOG_LEVEL,
  isDev: config.NODE_ENV === 'development',
});

/**
 * Generate a new invocation correlation ID.
 *
 * Used for tracing all logs from a single CLI invocation. Format: `inv_<random>`.
 */
export function newInvocationId(): string {
  return `inv_${randomBytes(8).toString('base64url')}`;
}

/**
 * Create a child logger that includes `invocationId` on every log entry.
 *
 * @param invocationId The correlation ID. Auto-generated when omitted.
 * @param baseLogger The parent logger to derive from. Defaults to the cached root logger.
 */
export function createInvocationLogger(invocationId?: string, baseLogger: Logger = logger): Logger {
  const id = invocationId ?? newInvocationId();
  return baseLogger.child({ invocationId: id });
}
