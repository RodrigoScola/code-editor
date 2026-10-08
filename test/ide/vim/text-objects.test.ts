import { describe, expect, it } from "vitest";
import { after } from "../harness.js";

// Text objects: i = inner, a = around (with the delimiters or the
// surrounding white space). :help text-objects

describe("words", () => {
  it("diw deletes the word", () => {
    expect(after("foo b|ar baz", "diw")).eq("foo | baz");
  });

  it("daw deletes the word and the space after it", () => {
    expect(after("foo b|ar baz", "daw")).eq("foo |baz");
  });

  it("daw on the last word takes the space before it", () => {
    expect(after("foo b|ar", "daw")).eq("fo|o");
  });

  it("ciw changes the word", () => {
    expect(after("foo b|ar baz", "ciwX<Esc>")).eq("foo |X baz");
  });

  it("yiw then P pastes the word before the cursor", () => {
    expect(after("foo b|ar", "yiwP")).eq("foo ba|rbar");
  });
});

describe("quotes", () => {
  it('di" deletes inside the quotes', () => {
    expect(after('say "he|llo" now', 'di"')).eq('say "|" now');
  });

  it('da" deletes the quotes and the space after them', () => {
    expect(after('say "he|llo" now', 'da"')).eq("say |now");
  });

  it('di" before the quotes uses the next quoted string', () => {
    expect(after('|x "ab"', 'di"')).eq('x "|"');
  });

  it("works with single quotes", () => {
    expect(after("a 'b|c' d", "di'")).eq("a '|' d");
  });
});

describe("brackets", () => {
  it("ci( changes inside the parentheses", () => {
    expect(after("f(a|, b)", "ci(x<Esc>")).eq("f(|x)");
  });

  it("da( deletes the parentheses too", () => {
    expect(after("f(a|, b)", "da(")).eq("|f");
  });

  it("uses the innermost pair", () => {
    expect(after("((a|))", "di(")).eq("((|))");
  });

  it("works with the cursor on the bracket", () => {
    expect(after("f|(ab)", "di(")).eq("f(|)");
  });

  it("di[ deletes inside square brackets", () => {
    expect(after("[1, |2]", "di[")).eq("[|]");
  });

  it("di{ over several lines keeps the brace lines", () => {
    expect(after("{\n  a|\n}", "di{")).eq("{\n|}");
  });
});

describe("tags", () => {
  it("dit deletes inside a tag", () => {
    expect(after("<a>he|llo</a>", "dit")).eq("<a>|</a>");
  });
});

describe("paragraphs", () => {
  it("dip deletes the paragraph and keeps the blank line", () => {
    expect(after("|a\nb\n\nc", "dip")).eq("|\nc");
  });

  it("dap deletes the paragraph and the blank line after it", () => {
    expect(after("|a\nb\n\nc", "dap")).eq("|c");
  });
});
