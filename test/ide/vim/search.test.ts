import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// / and ? search forward and backward, n and N repeat, * and # search for
// the word under the cursor. Searches wrap around the file. :help pattern

describe("/ forward search", () => {
  it("moves to the next match", () => {
    expect(after("|foo bar baz bar", "/bar<CR>")).eq("foo |bar baz bar");
  });

  it("n goes to the next match", () => {
    expect(after("|foo bar baz bar", "/bar<CR>n")).eq("foo bar baz |bar");
  });

  it("n wraps around to the top", () => {
    expect(after("|foo bar baz bar", "/bar<CR>nn")).eq("foo |bar baz bar");
  });

  it("N goes to the previous match, wrapping backwards", () => {
    expect(after("|foo bar baz bar", "/bar<CR>N")).eq("foo bar baz |bar");
  });

  it("finds matches on later lines", () => {
    expect(after("|a\nb\nfoo", "/foo<CR>")).eq("a\nb\n|foo");
  });

  it("takes a regular expression", () => {
    expect(after("|xx bzr", "/b.r<CR>")).eq("xx |bzr");
  });

  it("\\c makes it ignore case", () => {
    expect(after("|a FOO", "/\\cfoo<CR>")).eq("a |FOO");
  });

  it("stays put and says so when there is no match", () => {
    const ide = vim("|foo bar").keys("/zzz<CR>");

    expect(ide.text()).eq("|foo bar");
    expect(ide.statusLine()).toContain("Pattern not found");
  });

  it("works as a motion for operators", () => {
    expect(after("|abc x", "d/x<CR>")).eq("|x");
  });
});

describe("? backward search", () => {
  it("moves to the previous match", () => {
    expect(after("foo bar baz |qux", "?ba<CR>")).eq("foo bar |baz qux");
  });

  it("n keeps going backwards", () => {
    expect(after("foo bar baz |qux", "?ba<CR>n")).eq("foo |bar baz qux");
  });
});

describe("word under the cursor", () => {
  it("* searches forward for the whole word", () => {
    expect(after("|foo foobar foo", "*")).eq("foo foobar |foo");
  });

  it("# searches backward for the whole word", () => {
    expect(after("foo foobar |foo", "#")).eq("|foo foobar foo");
  });
});
