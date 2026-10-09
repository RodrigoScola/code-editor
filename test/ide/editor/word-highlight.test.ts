import { describe, expect, it } from "vitest";
import { wordOccurrences } from "../../../src/Editor/decorations/wordHighlight.js";
import { code } from "../harness.js";

// Proposed module src/Editor/decorations/wordHighlight.ts
// (editor.occurrencesHighlight): with the cursor on a word, every other
// occurrence of that word is highlighted. Without a language server this
// is text based: whole words, matching case.
//
//   wordOccurrences(lines, position) -> [{ line, start, end }]
//
// Commands: editor.action.wordHighlight.next / .prev move to the next /
// previous occurrence and select it.

describe("wordOccurrences", () => {
  it("finds every occurrence of the word at the cursor", () => {
    expect(wordOccurrences(["foo bar foo"], { line: 0, column: 9 })).toEqual([
      { line: 0, start: 0, end: 3 },
      { line: 0, start: 8, end: 11 },
    ]);
  });

  it("only matches whole words with the same case", () => {
    expect(wordOccurrences(["foo Foo food foo"], { line: 0, column: 0 })).toEqual([
      { line: 0, start: 0, end: 3 },
      { line: 0, start: 13, end: 16 },
    ]);
  });

  it("looks on every line", () => {
    expect(wordOccurrences(["a x", "x b"], { line: 0, column: 2 })).toHaveLength(2);
  });

  it("finds nothing when the cursor is not on a word", () => {
    expect(wordOccurrences(["a  b"], { line: 0, column: 2 })).toEqual([]);
  });

  it("counts the cursor right after a word as on it", () => {
    expect(wordOccurrences(["foo foo"], { line: 0, column: 3 })).toHaveLength(2);
  });
});

describe("moving between highlights", () => {
  it("next selects the next occurrence", () => {
    expect(code("f|oo bar foo").run("editor.action.wordHighlight.next").state()).eq(
      "foo bar «foo»",
    );
  });

  it("prev wraps around to the last one", () => {
    expect(code("f|oo bar foo").run("editor.action.wordHighlight.prev").state()).eq(
      "foo bar «foo»",
    );
  });
});
