import { describe, expect, it } from 'vitest';
import { ConfigError } from '../../../src/shared/errors.js';
import { loadConfig } from '../../../src/shared/config.js';

const validEnv = (): NodeJS.ProcessEnv => ({
  GEMINI_API_KEY: 'fake-key',
});

describe('loadConfig', () => {
  describe('normal cases', () => {
    it('parses a fully populated env into typed Config', () => {
      const cfg = loadConfig({
        GEMINI_API_KEY: 'k',
        GEMINI_IMAGE_MODEL: 'custom-model',
        MAX_PARALLEL_REQUESTS: '10',
        GENERATION_TIMEOUT_MS: '60000',
        MAX_RETRIES: '5',
        STORAGE_BACKEND: 'local',
        LOG_LEVEL: 'debug',
        WORKSPACE_ROOT: '/tmp/workspace',
        NODE_ENV: 'production',
      });
      expect(cfg).toEqual({
        GEMINI_API_KEY: 'k',
        GEMINI_IMAGE_MODEL: 'custom-model',
        MAX_PARALLEL_REQUESTS: 10,
        GENERATION_TIMEOUT_MS: 60000,
        MAX_RETRIES: 5,
        STORAGE_BACKEND: 'local',
        LOG_LEVEL: 'debug',
        WORKSPACE_ROOT: '/tmp/workspace',
        NODE_ENV: 'production',
      });
    });

    it('coerces numeric strings to numbers', () => {
      const cfg = loadConfig({ ...validEnv(), MAX_PARALLEL_REQUESTS: '7' });
      expect(cfg.MAX_PARALLEL_REQUESTS).toBe(7);
      expect(typeof cfg.MAX_PARALLEL_REQUESTS).toBe('number');
    });

    it('parses enum values', () => {
      const cfg = loadConfig({ ...validEnv(), LOG_LEVEL: 'warn' });
      expect(cfg.LOG_LEVEL).toBe('warn');
    });
  });

  describe('special cases', () => {
    it('only required env yields all documented defaults', () => {
      const cfg = loadConfig(validEnv());
      expect(cfg.GEMINI_IMAGE_MODEL).toBe('gemini-2.5-flash-image');
      expect(cfg.MAX_PARALLEL_REQUESTS).toBe(5);
      expect(cfg.GENERATION_TIMEOUT_MS).toBe(120_000);
      expect(cfg.MAX_RETRIES).toBe(3);
      expect(cfg.STORAGE_BACKEND).toBe('local');
      expect(cfg.LOG_LEVEL).toBe('info');
      expect(cfg.NODE_ENV).toBe('development');
    });

    it('WORKSPACE_ROOT defaults to process.cwd() when unset', () => {
      const cfg = loadConfig(validEnv());
      expect(cfg.WORKSPACE_ROOT).toBe(process.cwd());
    });

    it('MAX_RETRIES=0 is accepted (nonnegative)', () => {
      const cfg = loadConfig({ ...validEnv(), MAX_RETRIES: '0' });
      expect(cfg.MAX_RETRIES).toBe(0);
    });

    it.each(['error', 'warn', 'info', 'debug'])('LOG_LEVEL=%s accepted', (level) => {
      const cfg = loadConfig({ ...validEnv(), LOG_LEVEL: level });
      expect(cfg.LOG_LEVEL).toBe(level);
    });

    it.each(['development', 'production', 'test'])('NODE_ENV=%s accepted', (env) => {
      const cfg = loadConfig({ ...validEnv(), NODE_ENV: env });
      expect(cfg.NODE_ENV).toBe(env);
    });

    it("STORAGE_BACKEND='local' accepted", () => {
      const cfg = loadConfig({ ...validEnv(), STORAGE_BACKEND: 'local' });
      expect(cfg.STORAGE_BACKEND).toBe('local');
    });
  });

  describe('edge cases — validation failures', () => {
    it('missing GEMINI_API_KEY throws ConfigError naming the field', () => {
      try {
        loadConfig({});
        expect.fail('expected ConfigError');
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigError);
        const e = err as ConfigError;
        expect(e.code).toBe('CONFIG_INVALID');
        expect(e.message).toContain('GEMINI_API_KEY');
      }
    });

    it('empty GEMINI_API_KEY throws ConfigError (min 1 char)', () => {
      expect(() => loadConfig({ GEMINI_API_KEY: '' })).toThrow(ConfigError);
    });

    it('non-numeric MAX_PARALLEL_REQUESTS throws ConfigError', () => {
      try {
        loadConfig({ ...validEnv(), MAX_PARALLEL_REQUESTS: 'abc' });
        expect.fail('expected ConfigError');
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigError);
        expect((err as ConfigError).message).toContain('MAX_PARALLEL_REQUESTS');
      }
    });

    it('zero MAX_PARALLEL_REQUESTS throws (positive constraint)', () => {
      expect(() => loadConfig({ ...validEnv(), MAX_PARALLEL_REQUESTS: '0' })).toThrow(ConfigError);
    });

    it('negative MAX_PARALLEL_REQUESTS throws', () => {
      expect(() => loadConfig({ ...validEnv(), MAX_PARALLEL_REQUESTS: '-5' })).toThrow(ConfigError);
    });

    it('float MAX_PARALLEL_REQUESTS throws (int constraint)', () => {
      expect(() => loadConfig({ ...validEnv(), MAX_PARALLEL_REQUESTS: '5.5' })).toThrow(
        ConfigError,
      );
    });

    it('negative MAX_RETRIES throws', () => {
      expect(() => loadConfig({ ...validEnv(), MAX_RETRIES: '-1' })).toThrow(ConfigError);
    });

    it('invalid LOG_LEVEL enum value throws', () => {
      expect(() => loadConfig({ ...validEnv(), LOG_LEVEL: 'trace' })).toThrow(ConfigError);
    });

    it('invalid STORAGE_BACKEND throws (r2 not yet enum value)', () => {
      expect(() => loadConfig({ ...validEnv(), STORAGE_BACKEND: 'r2' })).toThrow(ConfigError);
    });

    it('invalid NODE_ENV throws', () => {
      expect(() => loadConfig({ ...validEnv(), NODE_ENV: 'staging' })).toThrow(ConfigError);
    });

    it('GENERATION_TIMEOUT_MS=0 throws (positive)', () => {
      expect(() => loadConfig({ ...validEnv(), GENERATION_TIMEOUT_MS: '0' })).toThrow(ConfigError);
    });

    it('multiple invalid fields surface all in the error message', () => {
      try {
        loadConfig({
          GEMINI_API_KEY: '',
          MAX_PARALLEL_REQUESTS: 'abc',
          LOG_LEVEL: 'silly',
        });
        expect.fail('expected ConfigError');
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigError);
        const msg = (err as ConfigError).message;
        expect(msg).toContain('GEMINI_API_KEY');
        expect(msg).toContain('MAX_PARALLEL_REQUESTS');
        expect(msg).toContain('LOG_LEVEL');
      }
    });

    it('thrown ConfigError preserves original ZodError in cause', () => {
      try {
        loadConfig({});
        expect.fail('expected ConfigError');
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigError);
        expect((err as ConfigError).cause).toBeDefined();
        expect((err as ConfigError).cause).toHaveProperty('issues');
      }
    });
  });
});
