import { describe, expect, it } from "vitest";
import { tokenizeLine } from "../../../src/Language/highlight.js";
import { vim } from "../harness.js";

// Proposed module src/Language/highlight.ts
//
//   tokenizeLine(language, line, state?) -> { tokens, state }
//     tokens: { start, end, type }[]  (columns, end exclusive, sorted,
//             not overlapping; plain text may be left out)
//     type: "keyword" | "string" | "comment" | "number" | "identifier" |
//           "operator" | "punctuation" | ...
//     state: what carries over to the next line (an open block comment,
//            an open template string); pass it into the next call
//
// Line by line with carried state means a change only re-tokenizes from the
// changed line until the state matches what it was before.
// The editor colors each token type through the styled text ranges from
// the UI specs (test/unit/ui/text/styled-ranges.test.ts).

function typeAt(tokens: { start: number; end: number; type: string }[], column: number) {
  return tokens.find((token) => token.start <= column && column < token.end)?.type;
}

const ts = (line: string, state?: unknown) => tokenizeLine("typescript", line, state as never);

describe("tokenizing TypeScript", () => {
  it("finds keywords and numbers", () => {
    const { tokens } = ts("const x = 1;");

    expect(tokens.find((t) => t.start === 0)).toMatchObject({ end: 5, type: "keyword" });
    expect(typeAt(tokens, 10)).eq("number");
  });

  it("does not treat a keyword inside a name as a keyword", () => {
    expect(typeAt(ts("constant = 1").tokens, 0)).not.eq("keyword");
  });

  it("finds strings with both quote kinds", () => {
    const line = `a = "x y" + 'z'`;
    const { tokens } = ts(line);

    expect(tokens).toContainEqual({ start: 4, end: 9, type: "string" });
    expect(tokens).toContainEqual({ start: 12, end: 15, type: "string" });
  });

  it("keeps an escaped quote inside the string", () => {
    const { tokens } = ts(String.raw`"a\"b"`);

    expect(tokens).toContainEqual({ start: 0, end: 6, type: "string" });
  });

  it("finds line comments", () => {
    const { tokens } = ts("x; // hi");

    expect(tokens).toContainEqual({ start: 3, end: 8, type: "comment" });
  });

  it("does not see comments inside strings", () => {
    const { tokens } = ts(`"//" + x`);

    expect(tokens.some((t) => t.type === "comment")).eq(false);
  });

  it("finds block comments on one line", () => {
    const { tokens } = ts("/* a */ x");

    expect(tokens).toContainEqual({ start: 0, end: 7, type: "comment" });
    expect(typeAt(tokens, 8)).not.eq("comment");
  });

  it("carries an open block comment to the next line", () => {
    const first = ts("x /* a");
    const second = ts("b */ y", first.state);

    expect(typeAt(first.tokens, 4)).eq("comment");
    expect(second.tokens).toContainEqual({ start: 0, end: 4, type: "comment" });
    expect(typeAt(second.tokens, 5)).not.eq("comment");
  });

  it("knows hex, decimal, exponent and separator numbers", () => {
    for (const number of ["0x1F", "1.5e3", "1_000"]) {
      const { tokens } = ts(`x = ${number};`);
      expect(tokens, number).toContainEqual({
        start: 4,
        end: 4 + number.length,
        type: "number",
      });
    }
  });

  it("returns sorted tokens that do not overlap", () => {
    const { tokens } = ts(`const s = "a" /* c */ + f(1, 'b') // end`);

    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].start).toBeGreaterThanOrEqual(tokens[i - 1].end);
    }
  });
});

describe("unknown languages", () => {
  it("have no tokens", () => {
    expect(tokenizeLine("plaintext", "const x = 1;").tokens).toEqual([]);
  });
});

describe("in the editor", () => {
  it("draws keywords in a different color from names", () => {
    const ide = vim("const x = 1;", { path: "a.ts", width: 40, height: 10 });
    ide.screen();
    const { x, y } = ide.textArea();
    const canvas = ide.canvas();

    const keyword = canvas.getCell(x, y)!.styles.color();
    const name = canvas.getCell(x + 6, y)!.styles.color();

    expect(keyword).not.eq(name);
  });

  it("does not color plain text files", () => {
    const ide = vim("const x = 1;", { path: "a.txt", width: 40, height: 10 });
    ide.screen();
    const { x, y } = ide.textArea();
    const canvas = ide.canvas();

    expect(canvas.getCell(x, y)!.styles.color()).eq(
      canvas.getCell(x + 6, y)!.styles.color(),
    );
  });
});
