import { describe, expect, it } from "vitest";
import { Configuration } from "../../../src/Settings/configuration.js";
import { modify, parseJsonc } from "../../../src/Settings/jsonc.js";
import { evaluateWhen } from "../../../src/Keybindings/whenClause.js";
import { KeybindingResolver } from "../../../src/Keybindings/resolver.js";

// Edge cases for settings and keybindings (base specs: configuration,
// settings-search, jsonc, when-clause, resolver).

describe("configuration", () => {
  it("an unknown setting still reads back from the user layer", () => {
    const config = new Configuration({ defaults: {} });
    config.setLayer("user", { "my.extension.thing": 5 });

    expect(config.get("my.extension.thing")).eq(5);
  });

  it("null in a higher scope is a real value, not missing", () => {
    const config = new Configuration({ defaults: { "a.b": "default" } });
    config.setLayer("user", { "a.b": null });

    expect(config.get("a.b")).toBeNull();
  });

  it("a language block in a folder beats a language block in the workspace", () => {
    const config = new Configuration({ defaults: { "editor.tabSize": 4 } });
    config.setLayer("workspace", { "[python]": { "editor.tabSize": 2 } });
    config.setFolderLayer("/p/app", { "[python]": { "editor.tabSize": 8 } });

    expect(config.get("editor.tabSize", { language: "python", folder: "/p/app" })).eq(8);
  });

  it("updating a value to undefined removes it from the layer", () => {
    const config = new Configuration({ defaults: { "editor.tabSize": 4 } });
    config.update("editor.tabSize", 2);
    config.update("editor.tabSize", undefined);

    expect(config.inspect("editor.tabSize").userValue).toBeUndefined();
  });
});

describe("jsonc", () => {
  it("an empty file has no errors", () => {
    expect(parseJsonc("").errors).toEqual([]);
  });

  it("a block comment that never ends is an error", () => {
    expect(parseJsonc("{ /* oops }").errors.length).toBeGreaterThan(0);
  });

  it("modify keeps a trailing comment on the changed line's neighbour", () => {
    const text = '{\n  "a": 1, // first\n  "b": 2\n}';

    expect(modify(text, ["b"], 3)).eq('{\n  "a": 1, // first\n  "b": 3\n}');
  });

  it("modify keeps tabs when the file uses tabs", () => {
    expect(modify('{\n\t"a": 1\n}', ["b"], 2)).eq('{\n\t"a": 1,\n\t"b": 2\n}');
  });

  it("modify of a key with a dot treats it as one key", () => {
    expect(JSON.parse(modify("{}", ["editor.tabSize"], 2))).toEqual({ "editor.tabSize": 2 });
  });
});

describe("when clauses", () => {
  it("a number value is compared as a number, not text", () => {
    expect(evaluateWhen("count > 10", { count: 9 })).eq(false);
    expect(evaluateWhen("count > 10", { count: 11 })).eq(true);
  });

  it("== with true compares with the boolean", () => {
    expect(evaluateWhen("flag == true", { flag: true })).eq(true);
    expect(evaluateWhen("flag == true", { flag: false })).eq(false);
  });

  it("a regex on an undefined key is false", () => {
    expect(evaluateWhen("missing =~ /x/", {})).eq(false);
  });

  it("extra spaces and newlines are fine", () => {
    expect(evaluateWhen("  a\n  &&   b  ", { a: true, b: true })).eq(true);
  });

  it("a negated comparison", () => {
    expect(evaluateWhen("!a == true", { a: false })).eq(true);
  });
});

describe("keybindings", () => {
  it("a removal rule with a when clause only removes the rule with that when", () => {
    const resolver = new KeybindingResolver(
      [
        { key: "f1", command: "x", when: "a" },
        { key: "f1", command: "x", when: "b" },
      ],
      [{ key: "f1", command: "-x", when: "a" }],
      { platform: "linux" },
    );

    expect(resolver.press("f1", { a: true }).kind).eq("none");
    expect(resolver.press("f1", { b: true }).command).eq("x");
  });

  it("a removal rule without a key removes the command from every key", () => {
    const resolver = new KeybindingResolver(
      [
        { key: "f1", command: "x" },
        { key: "f2", command: "x" },
      ],
      [{ command: "-x" }],
      { platform: "linux" },
    );

    expect([resolver.press("f1", {}).kind, resolver.press("f2", {}).kind]).toEqual(["none", "none"]);
  });

  it("a chord prefix that is also a full binding waits for the chord", () => {
    const resolver = new KeybindingResolver(
      [
        { key: "ctrl+k", command: "deleteAllRight" },
        { key: "ctrl+k ctrl+c", command: "addComment" },
      ],
      [],
      { platform: "linux" },
    );

    expect(resolver.press("ctrl+k", {}).kind).eq("chord");
  });
});
