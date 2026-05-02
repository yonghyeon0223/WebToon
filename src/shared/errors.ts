/**
 * Options for constructing a WebToonError.
 */
export interface WebToonErrorOptions {
  /** Machine-readable error code (e.g., 'NOT_FOUND', 'CONFIG_INVALID'). */
  code: string;
  /** Underlying error or value that caused this error. Preserved on `cause`. */
  cause?: unknown;
  /** Additional structured context (resource IDs, paths, etc.) for debugging. */
  context?: Record<string, unknown>;
}

/**
 * Base error class for the WebToon project.
 *
 * Every error thrown by application code extends this. Carries a machine-readable
 * `code` field separate from the human-readable `message` so callers can switch
 * on the code without parsing the message.
 *
 * Subclasses provide finer categorization (`StorageError`, `NotFoundError`, etc.)
 * for `instanceof` discrimination at catch sites.
 */
export class WebToonError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: WebToonErrorOptions) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code;
    if (options.context !== undefined) {
      this.context = options.context;
    }
    // V8-specific: removes the constructor frame from the stack trace.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Environment / configuration validation failure. Thrown at startup. */
export class ConfigError extends WebToonError {}

/** Generic storage operation failure (parent for FS-specific errors). */
export class StorageError extends WebToonError {}

/** A storage key resolved to a resource that does not exist. */
export class NotFoundError extends StorageError {}
