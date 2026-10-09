import { describe, expect, it } from "vitest";
import { schemaFor, validateJson } from "../../../src/Language/json.js";

// Proposed module src/Language/json.ts (VS Code's JSON language features).
//   schemaFor(path, text, settings) -> the schema URL for a file:
//     a "$schema" property in the file wins, then json.schemas entries
//     ({ fileMatch: globs, url }), else null
//   validateJson(text, schema) -> [{ message, path: (string | number)[] }]
//     type, required, enum, minimum/maximum, additionalProperties: false,
//     pattern, items; JSON with comments is accepted

const settings = {
  "json.schemas": [
    { fileMatch: ["/.babelrc", "*.babel.json"], url: "https://json.schemastore.org/babelrc" },
  ],
};

describe("schemaFor", () => {
  it("uses $schema from the file first", () => {
    expect(schemaFor("/p/a.json", '{ "$schema": "https://x/s.json" }', settings)).eq(
      "https://x/s.json",
    );
  });

  it("matches json.schemas fileMatch globs", () => {
    expect(schemaFor("/p/.babelrc", "{}", settings)).eq("https://json.schemastore.org/babelrc");
    expect(schemaFor("/p/app.babel.json", "{}", settings)).eq("https://json.schemastore.org/babelrc");
  });

  it("returns null when nothing matches", () => {
    expect(schemaFor("/p/a.json", "{}", settings)).toBeNull();
  });
});

describe("validateJson", () => {
  const schema = {
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      name: { type: "string", pattern: "^[a-z]+$" },
      size: { type: "number", minimum: 1, maximum: 10 },
      mode: { enum: ["fast", "slow"] },
      tags: { type: "array", items: { type: "string" } },
    },
  };

  it("accepts a valid document", () => {
    expect(validateJson('{ "name": "ok", "size": 3 }', schema)).toEqual([]);
  });

  it("allows comments", () => {
    expect(validateJson('{ // hi\n "name": "ok" }', schema)).toEqual([]);
  });

  it("reports a missing required property", () => {
    expect(validateJson("{}", schema)[0].message).toContain("name");
  });

  it("reports the wrong type with the property path", () => {
    const [problem] = validateJson('{ "name": 5 }', schema);

    expect(problem.path).toEqual(["name"]);
  });

  it("reports values out of range", () => {
    expect(validateJson('{ "name": "ok", "size": 11 }', schema)).toHaveLength(1);
  });

  it("reports a value not in the enum", () => {
    expect(validateJson('{ "name": "ok", "mode": "medium" }', schema)).toHaveLength(1);
  });

  it("reports properties the schema doesn't allow", () => {
    expect(validateJson('{ "name": "ok", "extra": 1 }', schema)[0].path).toEqual(["extra"]);
  });

  it("reports a string that doesn't match the pattern", () => {
    expect(validateJson('{ "name": "Not Ok" }', schema)).toHaveLength(1);
  });

  it("checks array items", () => {
    expect(validateJson('{ "name": "ok", "tags": ["a", 2] }', schema)[0].path).toEqual(["tags", 1]);
  });
});
