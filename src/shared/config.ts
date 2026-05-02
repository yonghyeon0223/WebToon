import { z, type ZodError } from 'zod';
import { ConfigError } from './errors.js';

/**
 * Schema for validated environment configuration.
 *
 * Number fields use `z.coerce.number()` because `process.env` values are always
 * strings. Coercion fails (rejecting the schema) for non-numeric values.
 */
const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_IMAGE_MODEL: z.string().default('gemini-2.5-flash-image'),
  MAX_PARALLEL_REQUESTS: z.coerce.number().int().positive().default(5),
  GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  STORAGE_BACKEND: z.enum(['local']).default('local'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  WORKSPACE_ROOT: z.string().default(() => process.cwd()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof EnvSchema>;

/**
 * Loads and validates a Config from the given env-like object.
 *
 * @param env Process env (or test fixture). Defaults to process.env.
 * @throws ConfigError when validation fails. Preserves the underlying ZodError
 *         in `cause` and lists every failed field in the message.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw configErrorFromZod(result.error);
  }
  return result.data;
}

function configErrorFromZod(zerr: ZodError): ConfigError {
  const issues = zerr.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return new ConfigError(`Invalid environment configuration: ${issues.join('; ')}`, {
    code: 'CONFIG_INVALID',
    cause: zerr,
    context: { issues: zerr.issues },
  });
}

/**
 * Cached, validated config for production runtime use.
 *
 * Validation runs once at module load. If env is invalid, throwing here aborts
 * any module that imports `config` — which is the desired fail-fast behavior.
 * For test isolation, call `loadConfig({...})` directly with a custom env object.
 */
export const config: Config = loadConfig();
