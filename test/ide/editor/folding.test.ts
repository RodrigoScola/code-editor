import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// Folding by indentation, the way VS Code folds: a fold starts at a line
// that is followed by more indented lines, and folding it hides those lines.
// The first line stays visible (and so does a closing bracket at the
// starting line's indentation).
//   zc close   zo open   za toggle   zM close all   zR open all
// Motions treat a closed fold as a single line.

const code = [
  "function f() {", // 0
  "  a;", //           1
  "  b;", //           2
  "}", //              3
  "x", //              4
].join("\n");

const ts = { path: "a.ts", width: 40, height: 16 };

describe("folding", () => {
  it("zc hides the lines inside the block", () => {
    const shown = vim(code, ts).keys("zc").textRows().join("\n");

    expect(shown).toContain("function f() {");
    expect(shown).not.toContain("a;");
    expect(shown).not.toContain("b;");
    expect(shown).toContain("}");
  });

  it("the folded line says how many lines are hidden", () => {
    const shown = vim(code, ts).keys("zc").textRows().join("\n");

    expect(shown).toContain("2 lines");
  });

  it("j jumps over a closed fold", () => {
    expect(vim(code, ts).keys("zcj").cursor().line).eq(3);
  });

  it("k jumps over a closed fold", () => {
    const ide = vim(code, ts).keys("zc");
    ide.window().cursor().line = 3;

    expect(ide.keys("k").cursor().line).eq(0);
  });

  it("zc inside a block closes the block around the cursor", () => {
    const ide = vim(code, ts);
    ide.window().cursor().line = 1;

    ide.keys("zc");

    expect(ide.cursor().line).eq(0);
    expect(ide.keys("j").cursor().line).eq(3);
  });

  it("zo opens it again", () => {
    const ide = vim(code, ts).keys("zc");
    expect(ide.textRows().join("\n")).not.toContain("a;");

    ide.keys("zo");

    expect(ide.textRows().join("\n")).toContain("a;");
    expect(ide.keys("j").cursor().line).eq(1);
  });

  it("za toggles", () => {
    const ide = vim(code, ts);

    expect(ide.keys("zaj").cursor().line).eq(3);
    expect(ide.keys("kzaj").cursor().line).eq(1);
  });

  it("zM closes every fold and zR opens them all", () => {
    const nested = "a {\n  b {\n    c\n  }\n}\nd";
    const ide = vim(nested, ts);

    expect(ide.keys("zM").textRows().join("\n")).not.toContain("b {");
    expect(ide.keys("zR").textRows().join("\n")).toContain("c");
  });
});
