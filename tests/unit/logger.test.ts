import { describe, expect, it } from 'vitest';
import { createInvocationLogger, createLogger, newInvocationId } from '../../src/logger.js';

/**
 * Capture pino output by providing a synchronous destination.
 *
 * Pino accepts any object with a `write(msg: string)` method. Using a sync
 * destination makes log entries available immediately after the .info()/.debug()
 * call returns, which keeps tests deterministic.
 */
function makeCapture(): { lines: Record<string, unknown>[]; sink: { write: (s: string) => void } } {
  const lines: Record<string, unknown>[] = [];
  const sink = {
    write(msg: string): void {
      const trimmed = msg.trim();
      if (trimmed.length > 0) {
        lines.push(JSON.parse(trimmed) as Record<string, unknown>);
      }
    },
  };
  return { lines, sink };
}

describe('createLogger', () => {
  describe('normal cases', () => {
    it('writes JSON with level, time, msg', () => {
      const { lines, sink } = makeCapture();
      const log = createLogger({ level: 'info', isDev: false, destination: sink });
      log.info('hello');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ msg: 'hello', level: 30 });
      expect(typeof lines[0]?.time).toBe('number');
    });

    it('respects level: debug suppressed at info', () => {
      const { lines, sink } = makeCapture();
      const log = createLogger({ level: 'info', isDev: false, destination: sink });
      log.debug('hidden');
      log.info('shown');
      expect(lines).toHaveLength(1);
      expect(lines[0]?.msg).toBe('shown');
    });
  });

  describe('special cases', () => {
    it('LOG_LEVEL=debug emits all levels', () => {
      const { lines, sink } = makeCapture();
      const log = createLogger({ level: 'debug', isDev: false, destination: sink });
      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e');
      expect(lines).toHaveLength(4);
    });

    it('LOG_LEVEL=error emits only error', () => {
      const { lines, sink } = makeCapture();
      const log = createLogger({ level: 'error', isDev: false, destination: sink });
      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e');
      expect(lines).toHaveLength(1);
      expect(lines[0]?.msg).toBe('e');
    });

    it('logging an object includes its fields', () => {
      const { lines, sink } = makeCapture();
      const log = createLogger({ level: 'info', isDev: false, destination: sink });
      log.info({ foo: 'bar', count: 3 }, 'message');
      expect(lines[0]).toMatchObject({ msg: 'message', foo: 'bar', count: 3 });
    });
  });

  describe('edge cases', () => {
    it('empty message produces a line with empty msg', () => {
      const { lines, sink } = makeCapture();
      const log = createLogger({ level: 'info', isDev: false, destination: sink });
      log.info('');
      expect(lines).toHaveLength(1);
      expect(lines[0]?.msg).toBe('');
    });

    it('logging a circular reference does not crash', () => {
      const { lines, sink } = makeCapture();
      const log = createLogger({ level: 'info', isDev: false, destination: sink });
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      expect(() => { log.info(obj, 'circular'); }).not.toThrow();
      expect(lines).toHaveLength(1);
    });

    it('isDev: true returns a usable Logger (pino-pretty transport branch)', () => {
      // We exercise the dev branch but cannot easily assert on pretty output
      // (it is delivered to stdout via a worker thread). Verifying the logger
      // is constructed and exposes the standard interface is enough to cover
      // this code path.
      const log = createLogger({ level: 'info', isDev: true });
      expect(log).toBeDefined();
      expect(typeof log.info).toBe('function');
      expect(typeof log.child).toBe('function');
    });
  });
});

describe('createInvocationLogger', () => {
  it('child logger includes invocationId on every entry', () => {
    const { lines, sink } = makeCapture();
    const base = createLogger({ level: 'info', isDev: false, destination: sink });
    const child = createInvocationLogger('inv_test_42', base);
    child.info('one');
    child.info('two');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ invocationId: 'inv_test_42', msg: 'one' });
    expect(lines[1]).toMatchObject({ invocationId: 'inv_test_42', msg: 'two' });
  });

  it('omitting invocationId auto-generates one', () => {
    const { lines, sink } = makeCapture();
    const base = createLogger({ level: 'info', isDev: false, destination: sink });
    const child = createInvocationLogger(undefined, base);
    child.info('hi');
    expect(lines[0]?.invocationId).toMatch(/^inv_/);
  });

  it('two child loggers maintain independent IDs', () => {
    const { lines, sink } = makeCapture();
    const base = createLogger({ level: 'info', isDev: false, destination: sink });
    const a = createInvocationLogger('inv_a', base);
    const b = createInvocationLogger('inv_b', base);
    a.info('from a');
    b.info('from b');
    expect(lines[0]?.invocationId).toBe('inv_a');
    expect(lines[1]?.invocationId).toBe('inv_b');
  });

  it('child inherits root level (debug suppressed at info root)', () => {
    const { lines, sink } = makeCapture();
    const base = createLogger({ level: 'info', isDev: false, destination: sink });
    const child = createInvocationLogger('inv_x', base);
    child.debug('hidden');
    child.info('shown');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.msg).toBe('shown');
  });
});

describe('newInvocationId', () => {
  it('returns a string starting with inv_', () => {
    expect(newInvocationId()).toMatch(/^inv_/);
  });

  it('produces unique IDs across many calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(newInvocationId());
    }
    expect(ids.size).toBe(1000);
  });

  it('contains only URL-safe characters after the prefix', () => {
    const id = newInvocationId();
    const tail = id.slice('inv_'.length);
    expect(tail).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
