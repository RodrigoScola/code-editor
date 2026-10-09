import { describe, expect, it } from "vitest";
import {
  KeybindingResolver,
  keyLabel,
  normalizeKey,
  searchKeybindings,
} from "../../../src/Keybindings/resolver.js";

// keybindings.json and resolving key presses. Proposed
// src/Keybindings/resolver.ts:
//   normalizeKey("Shift+Ctrl+P") -> "ctrl+shift+p" (modifiers in the order
//     ctrl, shift, alt, meta/cmd/win; chords separated by one space)
//   new KeybindingResolver(defaults, userRules, { platform })
//     rule: { key, command, when?, args? }; "-command" removes matching
//     default rules (by command, and key/when when given); "" disables a key
//   resolver.press(key, context) -> { kind: "command", command, args } |
//     { kind: "chord" } (waiting for the second part) | { kind: "none" }
//     rules are checked from the last to the first; the first whose key and
//     when match wins; user rules come after defaults
//   resolver.conflicts(key) -> commands bound to the same key
//   keyLabel(key, platform) -> "Ctrl+Shift+P" or "⇧⌘P" on macOS
//   searchKeybindings(rules, query): words in the command, "@source:user",
//     a quoted key ("ctrl+k") matching keys that contain it

const defaults = [
  { key: "ctrl+/", command: "editor.action.commentLine", when: "editorTextFocus" },
  { key: "ctrl+k ctrl+c", command: "editor.action.addCommentLine", when: "editorTextFocus" },
  { key: "ctrl+f", command: "actions.find", when: "editorFocus" },
  { key: "ctrl+f", command: "workbench.action.terminal.focusFind", when: "terminalFocus" },
  { key: "f5", command: "workbench.action.debug.start", when: "!inDebugMode" },
  { key: "f5", command: "workbench.action.debug.continue", when: "inDebugMode" },
];

const editor = { editorTextFocus: true, editorFocus: true };

describe("normalizeKey", () => {
  it("orders modifiers and lower cases", () => {
    expect(normalizeKey("Shift+Ctrl+P")).eq("ctrl+shift+p");
  });

  it("normalizes each part of a chord", () => {
    expect(normalizeKey("Ctrl+K  Ctrl+C")).eq("ctrl+k ctrl+c");
  });
});

describe("resolving", () => {
  it("finds the command for a key", () => {
    const resolver = new KeybindingResolver(defaults, [], { platform: "linux" });

    expect(resolver.press("ctrl+/", editor)).toEqual({ kind: "command", command: "editor.action.commentLine", args: undefined });
  });

  it("uses the when clause to pick between rules for the same key", () => {
    const resolver = new KeybindingResolver(defaults, [], { platform: "linux" });

    expect(resolver.press("ctrl+f", { terminalFocus: true }).command).eq("workbench.action.terminal.focusFind");
    expect(resolver.press("f5", { inDebugMode: true }).command).eq("workbench.action.debug.continue");
  });

  it("does nothing when no when clause matches", () => {
    const resolver = new KeybindingResolver(defaults, [], { platform: "linux" });

    expect(resolver.press("ctrl+/", {})).toEqual({ kind: "none" });
  });

  it("a user rule for the same key wins", () => {
    const resolver = new KeybindingResolver(defaults, [{ key: "ctrl+/", command: "my.command" }], { platform: "linux" });

    expect(resolver.press("ctrl+/", editor).command).eq("my.command");
  });

  it("-command removes the default rule", () => {
    const resolver = new KeybindingResolver(
      defaults,
      [{ key: "ctrl+/", command: "-editor.action.commentLine" }],
      { platform: "linux" },
    );

    expect(resolver.press("ctrl+/", editor)).toEqual({ kind: "none" });
  });

  it("an empty command disables the key", () => {
    const resolver = new KeybindingResolver(defaults, [{ key: "f5", command: "" }], { platform: "linux" });

    expect(resolver.press("f5", {})).toEqual({ kind: "none" });
  });

  it("passes args", () => {
    const resolver = new KeybindingResolver(
      [],
      [{ key: "ctrl+shift+1", command: "workbench.action.terminal.sendSequence", args: { text: "ls\n" } }],
      { platform: "linux" },
    );

    expect(resolver.press("ctrl+shift+1", {})).toMatchObject({ args: { text: "ls\n" } });
  });

  it("keys match however the modifiers are written", () => {
    const resolver = new KeybindingResolver([], [{ key: "Shift+Ctrl+P", command: "palette" }], { platform: "linux" });

    expect(resolver.press("ctrl+shift+p", {}).command).eq("palette");
  });
});

describe("chords", () => {
  it("the first part waits for the second", () => {
    const resolver = new KeybindingResolver(defaults, [], { platform: "linux" });

    expect(resolver.press("ctrl+k", editor)).toEqual({ kind: "chord" });
    expect(resolver.press("ctrl+c", editor).command).eq("editor.action.addCommentLine");
  });

  it("a wrong second part does nothing and resets", () => {
    const resolver = new KeybindingResolver(defaults, [], { platform: "linux" });

    resolver.press("ctrl+k", editor);
    expect(resolver.press("x", editor)).toEqual({ kind: "none" });
    expect(resolver.press("ctrl+/", editor).command).eq("editor.action.commentLine");
  });
});

describe("conflicts", () => {
  it("lists every command on a key", () => {
    const resolver = new KeybindingResolver(defaults, [], { platform: "linux" });

    expect(resolver.conflicts("ctrl+f").sort()).toEqual(["actions.find", "workbench.action.terminal.focusFind"]);
  });
});

describe("labels", () => {
  it("Windows and Linux", () => {
    expect(keyLabel("ctrl+shift+p", "win32")).eq("Ctrl+Shift+P");
    expect(keyLabel("ctrl+k ctrl+c", "linux")).eq("Ctrl+K Ctrl+C");
  });

  it("macOS symbols in macOS order", () => {
    expect(keyLabel("cmd+shift+p", "darwin")).eq("⇧⌘P");
    expect(keyLabel("ctrl+alt+shift+cmd+k", "darwin")).eq("⌃⌥⇧⌘K");
  });
});

describe("searchKeybindings", () => {
  const rules = [
    ...defaults.map((r) => ({ ...r, source: "default" })),
    { key: "ctrl+k ctrl+t", command: "workbench.action.selectTheme", source: "user" },
  ];

  it("finds by command words", () => {
    expect(searchKeybindings(rules, "comment").map((r: { command: string }) => r.command)).toEqual([
      "editor.action.commentLine",
      "editor.action.addCommentLine",
    ]);
  });

  it("@source:user", () => {
    expect(searchKeybindings(rules, "@source:user").map((r: { command: string }) => r.command)).toEqual([
      "workbench.action.selectTheme",
    ]);
  });

  it("a quoted key finds bindings that use it", () => {
    expect(searchKeybindings(rules, '"ctrl+k"').map((r: { command: string }) => r.command)).toEqual([
      "editor.action.addCommentLine",
      "workbench.action.selectTheme",
    ]);
  });
});
