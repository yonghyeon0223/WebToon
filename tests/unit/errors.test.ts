import { describe, expect, it } from 'vitest';
import { ConfigError, NotFoundError, StorageError, WebToonError } from '../../src/errors.js';

describe('WebToonError', () => {
  describe('normal cases', () => {
    it('constructs with all options accessible', () => {
      const cause = new Error('original');
      const ctx = { foo: 'bar' };
      const err = new WebToonError('something failed', {
        code: 'TEST_CODE',
        cause,
        context: ctx,
      });
      expect(err.message).toBe('something failed');
      expect(err.code).toBe('TEST_CODE');
      expect(err.cause).toBe(cause);
      expect(err.context).toEqual(ctx);
    });

    it('subclass NotFoundError carries code and message', () => {
      const err = new NotFoundError('not here', { code: 'NOT_FOUND' });
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('not here');
    });

    it('instanceof chain works', () => {
      const err = new NotFoundError('x', { code: 'NOT_FOUND' });
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err).toBeInstanceOf(StorageError);
      expect(err).toBeInstanceOf(WebToonError);
      expect(err).toBeInstanceOf(Error);
    });

    it('error.name reflects the subclass constructor name', () => {
      expect(new NotFoundError('x', { code: 'NOT_FOUND' }).name).toBe('NotFoundError');
      expect(new StorageError('x', { code: 'X' }).name).toBe('StorageError');
      expect(new ConfigError('x', { code: 'X' }).name).toBe('ConfigError');
      expect(new WebToonError('x', { code: 'X' }).name).toBe('WebToonError');
    });
  });

  describe('special cases', () => {
    it('omitting cause leaves it undefined', () => {
      const err = new WebToonError('msg', { code: 'X' });
      expect(err.cause).toBeUndefined();
    });

    it('omitting context leaves it undefined', () => {
      const err = new WebToonError('msg', { code: 'X' });
      expect(err.context).toBeUndefined();
    });

    it('empty context object is preserved as empty object', () => {
      const err = new WebToonError('msg', { code: 'X', context: {} });
      expect(err.context).toEqual({});
    });

    it('cause that is itself a WebToonError is preserved by reference', () => {
      const inner = new NotFoundError('inner', { code: 'NOT_FOUND' });
      const outer = new StorageError('outer', { code: 'STORAGE_FAIL', cause: inner });
      expect(outer.cause).toBe(inner);
    });

    it('cause that is a non-Error value is preserved', () => {
      const err1 = new WebToonError('m', { code: 'X', cause: 'string reason' });
      const err2 = new WebToonError('m', { code: 'X', cause: 42 });
      expect(err1.cause).toBe('string reason');
      expect(err2.cause).toBe(42);
    });

    it('cause that is a native Error preserves identity', () => {
      const native = new TypeError('boom');
      const err = new WebToonError('m', { code: 'X', cause: native });
      expect(err.cause).toBe(native);
    });
  });

  describe('edge cases', () => {
    it('empty message string accepted', () => {
      const err = new WebToonError('', { code: 'X' });
      expect(err.message).toBe('');
    });

    it('very long message accepted without truncation', () => {
      const long = 'x'.repeat(10_000);
      const err = new WebToonError(long, { code: 'X' });
      expect(err.message.length).toBe(10_000);
    });

    it('code with special characters preserved verbatim', () => {
      const err = new WebToonError('m', { code: 'ERR:STORAGE/NOT_FOUND' });
      expect(err.code).toBe('ERR:STORAGE/NOT_FOUND');
    });

    it('context with circular reference does not crash construction', () => {
      const ctx: Record<string, unknown> = { a: 1 };
      ctx.self = ctx;
      expect(() => new WebToonError('m', { code: 'X', context: ctx })).not.toThrow();
    });

    it('stack trace includes the call site', () => {
      const err = new WebToonError('m', { code: 'X' });
      expect(err.stack).toBeDefined();
      expect(err.stack).toContain('WebToonError');
    });

    it('Error.cause standard preserved (Node 16+)', () => {
      const cause = new Error('underlying');
      const err = new WebToonError('m', { code: 'X', cause });
      expect(err.cause).toBe(cause);
    });
  });
});
