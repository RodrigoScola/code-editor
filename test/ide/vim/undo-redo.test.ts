import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// u undoes, <C-r> redoes. Everything typed between entering insert mode and
// leaving it is one change. :help undo.txt
//
// Where it matters, a test checks the change happened before undoing it, so
// it can't pass just because the keys do nothing yet.

describe("undo", () => {
  it("u undoes the last change", () => {
    const ide = vim("|abc").keys("x");
    expect(ide.text()).eq("|bc");

    expect(ide.keys("u").text()).eq("|abc");
  });

  it("u can go back several changes", () => {
    const ide = vim("|abc").keys("xx");
    expect(ide.text()).eq("|c");

    expect(ide.keys("u").text()).eq("|bc");
    expect(ide.keys("u").text()).eq("|abc");
  });

  it("2u undoes two changes", () => {
    expect(after("|abc", "xxx2u")).eq("|bc");
  });

  it("a whole insert session is one change", () => {
    expect(after("|", "ihello world<Esc>u")).eq("|");
  });

  it("o and what was typed after it is one change", () => {
    expect(after("|a", "ob<Esc>u")).eq("|a");
  });

  it("puts the cursor back on the changed line", () => {
    expect(after("abc\n|def", "ddggu")).eq("abc\n|def");
  });

  it("undoes a put", () => {
    const ide = vim("|a").keys("yyp");
    expect(ide.lines()).toEqual(["a", "a"]);

    expect(ide.keys("u").text()).eq("|a");
  });

  it("with nothing to undo does nothing", () => {
    expect(after("|abc", "u")).eq("|abc");
  });
});

describe("redo", () => {
  it("<C-r> redoes what u undid", () => {
    expect(after("|abc", "xu<C-r>")).eq("|bc");
  });

  it("a new change throws away what could be redone", () => {
    expect(after("|abc", "xux<C-r>")).eq("|bc");
  });
});
