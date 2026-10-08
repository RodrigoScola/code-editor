import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// Typing an opening bracket or quote in insert mode adds the closing one,
// like VS Code's autoClosingBrackets. "|" is the insertion point.
// - typing the closing character right before one that was auto-inserted
//   steps over it instead of adding another
// - <BS> between an empty auto-inserted pair deletes both
// - nothing is added right before a word character, or for a quote right
//   after one (don't)

const typed = (start: string, keys: string) => vim(start).keys(keys).text();

describe("auto-closing pairs", () => {
  it("( adds )", () => {
    expect(typed("|", "i(")).eq("(|)");
  });

  it("[ adds ] and { adds }", () => {
    expect(typed("|", "i[")).eq("[|]");
    expect(typed("|", "i{")).eq("{|}");
  });

  it('" adds "', () => {
    expect(typed("|", 'i"')).eq('"|"');
  });

  it("typing the closing bracket steps over the inserted one", () => {
    const ide = vim("|").keys("i(");
    expect(ide.text()).eq("(|)");

    expect(ide.keys(")").text()).eq("()|");
  });

  it("only steps over brackets it inserted itself", () => {
    expect(typed("|)", "i)")).eq(")|)");
  });

  it("<BS> in an empty pair deletes both", () => {
    const ide = vim("|").keys("i(");
    expect(ide.text()).eq("(|)");

    expect(ide.keys("<BS>").text()).eq("|");
  });

  it("does not pair right before a word", () => {
    expect(typed("|foo", "i(")).eq("(|foo");
  });

  it("does not pair a quote right after a word", () => {
    expect(typed("|", "idon'")).eq("don'|");
  });
});
