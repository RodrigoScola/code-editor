import { describe, expect, it } from "vitest";
import { modify, parseJsonc, validate } from "../../../src/Settings/jsonc.js";

// JSON with comments, as settings.json, tasks.json and friends are written.
// Proposed src/Settings/jsonc.ts:
//   parseJsonc(text) -> { value, errors: [{ message, offset }] }
//     // and /* */ comments and trailing commas are allowed; on an error the
//     rest is still read as well as possible
//   modify(text, path, value) -> new text. Changes only what it has to:
//     comments and formatting elsewhere stay; a new property is added at
//     the end of its object with the same indentation; values are written
//     on one line like JSON.stringify; value undefined removes the
//     property (and its comma)
//   validate(value, schema) -> [{ path, message }]

describe("parseJsonc", () => {
  it("reads comments and trailing commas", () => {
    const { value, errors } = parseJsonc('{\n  // line\n  "a": 1, /* block */\n  "b": [1, 2,],\n}');

    expect(errors).toEqual([]);
    expect(value).toEqual({ a: 1, b: [1, 2] });
  });

  it("reports a missing comma with its offset", () => {
    const text = '{ "a": 1 "b": 2 }';
    const { errors } = parseJsonc(text);

    expect(errors).toHaveLength(1);
    expect(errors[0].offset).eq(text.indexOf('"b"'));
  });

  it("reports an unterminated string", () => {
    expect(parseJsonc('{ "a": "oops }').errors.length).toBeGreaterThan(0);
  });

  it("keeps the values it could read before an error", () => {
    expect(parseJsonc('{ "a": 1, "b": }').value).toMatchObject({ a: 1 });
  });

  it("does not treat // inside strings as a comment", () => {
    expect(parseJsonc('{ "url": "https://x.com" }').value).toEqual({ url: "https://x.com" });
  });
});

describe("modify", () => {
  const text = '{\n  // tabs\n  "editor.tabSize": 4,\n  "files.eol": "\\n"\n}';

  it("changes a value and keeps the comment", () => {
    expect(modify(text, ["editor.tabSize"], 2)).eq('{\n  // tabs\n  "editor.tabSize": 2,\n  "files.eol": "\\n"\n}');
  });

  it("adds a property at the end with the same indentation", () => {
    expect(modify(text, ["editor.rulers"], [80])).eq(
      '{\n  // tabs\n  "editor.tabSize": 4,\n  "files.eol": "\\n",\n  "editor.rulers": [80]\n}',
    );
  });

  it("removes a property and the comma before it when it was last", () => {
    expect(modify(text, ["files.eol"], undefined)).eq('{\n  // tabs\n  "editor.tabSize": 4\n}');
  });

  it("removes a property in the middle with its own comma", () => {
    expect(modify('{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}', ["b"], undefined)).eq('{\n  "a": 1,\n  "c": 3\n}');
  });

  it("creates objects along a path", () => {
    expect(JSON.parse(modify("{}", ["[typescript]", "editor.tabSize"], 2))).toEqual({
      "[typescript]": { "editor.tabSize": 2 },
    });
  });

  it("adds to an empty file", () => {
    expect(JSON.parse(modify("", ["a"], 1))).toEqual({ a: 1 });
  });
});

describe("validate", () => {
  const schema = {
    type: "object",
    properties: {
      "editor.tabSize": { type: "number", minimum: 1, maximum: 16 },
      "editor.wordWrap": { enum: ["off", "on", "wordWrapColumn", "bounded"] },
    },
  };

  it("accepts good values", () => {
    expect(validate({ "editor.tabSize": 2, "editor.wordWrap": "on" }, schema)).toEqual([]);
  });

  it("reports a wrong type", () => {
    expect(validate({ "editor.tabSize": "2" }, schema)[0].path).toEqual(["editor.tabSize"]);
  });

  it("reports out of range numbers and values outside the enum", () => {
    expect(validate({ "editor.tabSize": 0, "editor.wordWrap": "sometimes" }, schema)).toHaveLength(2);
  });
});
