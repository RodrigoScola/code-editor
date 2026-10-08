import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../../../src");

function sourceFiles() {
  return readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .map((file) => ({
      file,
      text: readFileSync(join(SRC, file), "utf8"),
    }));
}

describe("runtime code", () => {
  // vitest is a dev dependency; importing it from src breaks the built app
  // the moment the import is actually used
  it("never imports the test runner", () => {
    const offenders = sourceFiles()
      .filter(({ text }) => /from\s+["']vitest["']/.test(text))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
