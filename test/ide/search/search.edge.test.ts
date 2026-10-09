import { describe, expect, it } from "vitest";
import { match, matchExpression } from "../../../src/Search/glob.js";
import { searchFiles } from "../../../src/Search/projectSearch.js";
import { workspace } from "../../ide/harness.js";

// Edge cases for globs and search (base specs: glob, search-view).

describe("globs", () => {
  it("** alone matches everything", () => {
    expect(match("**", "a/b/c.ts")).eq(true);
  });

  it("**/ in the middle can match zero folders", () => {
    expect(match("src/**/a.ts", "src/a.ts")).eq(true);
  });

  it("a trailing slash is not needed to match a folder's path", () => {
    expect(match("**/build", "x/build")).eq(true);
  });

  it("an empty pattern matches nothing", () => {
    expect(match("", "a.ts")).eq(false);
  });

  it("? does not match a slash", () => {
    expect(match("a?b", "a/b")).eq(false);
  });

  it("a when condition with a different extension", () => {
    expect(matchExpression({ "**/*.map": { when: "$(basename)" } }, "a.js.map", ["a.js", "a.js.map"])).eq(true);
  });
});

describe("search", () => {
  it("finds several matches on one line", () => {
    const root = workspace({ "a.txt": "ab ab ab" });

    expect(searchFiles(root, "ab", { useExcludeSettingsAndIgnoreFiles: false }).map((r: { column: number }) => r.column)).toEqual([0, 3, 6]);
  });

  it("finds nothing in an empty file without failing", () => {
    expect(searchFiles(workspace({ "a.txt": "" }), "x", {})).toEqual([]);
  });

  it("a regex that can match nothing doesn't loop forever", () => {
    const root = workspace({ "a.txt": "abc" });

    expect(() => searchFiles(root, "x*", { regex: true })).not.toThrow();
  });

  it("an invalid regex is an error, not a crash", () => {
    expect(() => searchFiles(workspace({ "a.txt": "a" }), "(", { regex: true })).toThrow(/regular expression/i);
  });

  it("files with CRLF line endings report the right columns", () => {
    const root = workspace({ "a.txt": "x\r\nfoo" });

    expect(searchFiles(root, "foo", {})[0]).toMatchObject({ line: 1, column: 0, text: "foo" });
  });

  it("whole word with punctuation around the match", () => {
    const root = workspace({ "a.txt": "(cat), concat" });

    expect(searchFiles(root, "cat", { wholeWord: true })).toHaveLength(1);
  });
});
