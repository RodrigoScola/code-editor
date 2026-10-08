import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// :[range]s/pattern/replacement/[flags]
//   no range = current line, % = whole file, '<,'> = last visual selection
//   flags: g (every match on the line, not just the first), i (ignore case)
//   replacement: & is the whole match, \1..\9 are \( \) groups (Vim regex)
// :help :substitute

const run = (text: string, keys: string) => vim(text).keys(keys).lines();

describe(":s", () => {
  it("replaces the first match on the current line", () => {
    expect(run("|foo foo\nfoo", ":s/foo/bar/<CR>")).toEqual(["bar foo", "foo"]);
  });

  it("g replaces every match on the line", () => {
    expect(run("|foo foo\nfoo", ":s/foo/bar/g<CR>")).toEqual(["bar bar", "foo"]);
  });

  it("% applies to the whole file", () => {
    expect(run("|foo foo\nfoo", ":%s/foo/bar/g<CR>")).toEqual(["bar bar", "bar"]);
  });

  it("takes a line range", () => {
    expect(run("|a\na\na\na", ":2,3s/a/b/<CR>")).toEqual(["a", "b", "b", "a"]);
  });

  it("applies to the visual selection", () => {
    expect(run("|a\na\na", "Vj:s/a/b/<CR>")).toEqual(["b", "b", "a"]);
  });

  it("i ignores case", () => {
    expect(run("|foo", ":s/FOO/bar/i<CR>")).toEqual(["bar"]);
  });

  it("& in the replacement is the whole match", () => {
    expect(run("|foo", ":s/o/[&]/g<CR>")).toEqual(["f[o][o]"]);
  });

  it("\\1 and \\2 are the groups", () => {
    expect(
      run("|hello world", ":s/\\(\\w\\+\\) \\(\\w\\+\\)/\\2 \\1/<CR>"),
    ).toEqual(["world hello"]);
  });

  it("any punctuation can be the separator", () => {
    expect(run("|a/b/c", ":s#/#-#g<CR>")).toEqual(["a-b-c"]);
  });

  it("reports when nothing matched and changes nothing", () => {
    const ide = vim("|abc").keys(":s/zzz/y/<CR>");

    expect(ide.lines()).toEqual(["abc"]);
    expect(ide.statusLine()).toContain("Pattern not found");
  });

  it("is undone in one step", () => {
    const ide = vim("|a\na").keys(":%s/a/b/g<CR>");
    expect(ide.lines()).toEqual(["b", "b"]);

    expect(ide.keys("u").lines()).toEqual(["a", "a"]);
  });
});
