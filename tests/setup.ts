// Vitest setup file — runs once per worker before any test imports.
// Provides a baseline valid environment so that modules importing `config`
// (which validates env at load time) don't crash during test collection.
// Individual tests can call `loadConfig({...})` to test custom envs.

process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
