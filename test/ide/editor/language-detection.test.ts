import { describe, expect, it } from "vitest";
import { detectLanguage, languageConfig } from "../../../src/Language/languages.js";

// Proposed module src/Language/languages.ts
//
//   detectLanguage(path, firstLine?) -> language id ("typescript", ...)
//     by extension (any case), then by file name, then by a #! line,
//     otherwise "plaintext"
//   languageConfig(id) -> { lineComment?, blockComment?, brackets, ... }
//
// Everything language-specific (comments, highlighting, auto-pairs,
// indentation rules, the status line's file type) starts from these.

describe("detectLanguage", () => {
  it.each([
    ["a.ts", "typescript"],
    ["a.js", "javascript"],
    ["a.mjs", "javascript"],
    ["a.json", "json"],
    ["a.py", "python"],
    ["a.md", "markdown"],
    ["a.rs", "rust"],
    ["a.go", "go"],
    ["a.c", "c"],
    ["a.java", "java"],
    ["a.sh", "shell"],
    ["a.html", "html"],
    ["a.css", "css"],
    ["a.yml", "yaml"],
  ])("%s is %s", (path, language) => {
    expect(detectLanguage(path)).eq(language);
  });

  it("ignores the case of the extension", () => {
    expect(detectLanguage("SRC/MAIN.TS")).eq("typescript");
  });

  it("knows files by name", () => {
    expect(detectLanguage("project/Makefile")).eq("makefile");
    expect(detectLanguage("Dockerfile")).eq("dockerfile");
  });

  it("reads the #! line of files without an extension", () => {
    expect(detectLanguage("bin/run", "#!/usr/bin/env node")).eq("javascript");
    expect(detectLanguage("bin/run", "#!/bin/bash")).eq("shell");
    expect(detectLanguage("bin/run", "#!/usr/bin/env python3")).eq("python");
  });

  it("falls back to plaintext", () => {
    expect(detectLanguage("notes.unknownext")).eq("plaintext");
    expect(detectLanguage("README")).eq("plaintext");
  });
});

describe("languageConfig", () => {
  it("has the line comment for each language", () => {
    expect(languageConfig("typescript").lineComment).eq("//");
    expect(languageConfig("python").lineComment).eq("#");
  });

  it("has block comments where there are no line comments", () => {
    expect(languageConfig("html").blockComment).toEqual(["<!--", "-->"]);
  });

  it("has the bracket pairs", () => {
    expect(languageConfig("typescript").brackets).toContainEqual(["{", "}"]);
  });

  it("gives plaintext an empty config instead of throwing", () => {
    expect(() => languageConfig("plaintext")).not.toThrow();
  });
});
