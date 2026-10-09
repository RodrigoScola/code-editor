import { afterEach, beforeEach, vi } from "vitest";
import { Configuration, setConfiguration } from "../src/config.js";

// Runs before every spec file (vitest.config.ts, setupFiles).

// A key binding that calls process.exit (like :q) would end the whole test
// run. Make it throw instead, so the spec fails with a clear message.
beforeEach(() => {
  vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Error(`process.exit(${code}) was called`);
  }) as typeof process.exit);
});

// Settings are global (src/config.ts), and ctx.setting(key, value) changes
// them. Put the defaults back so one spec's settings don't leak into the next.
const defaults = Configuration();
beforeEach(() => {
  setConfiguration(defaults);
});

afterEach(() => {
  vi.restoreAllMocks();
});
