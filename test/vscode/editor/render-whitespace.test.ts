import { describe, expect, it } from "vitest";
import { renderWhitespace } from "../../../src/Editor/decorations/whitespace.js";
import { code } from "../harness.js";

// Proposed module src/Editor/decorations/whitespace.ts (editor.renderWhitespace):
//   renderWhitespace(line, mode, { tabSize, selections? }) -> the line as
//   drawn, spaces shown as "·" and a tab as "→" padded to its tab stop.
// Modes:
//   none      nothing shown
//   boundary  everything except single spaces between words
//   selection only inside the selected ranges ([start, end) columns)
//   trailing  only white space at the end of the line
//   all       every space and tab
// editor.action.toggleRenderWhitespace switches between none and all.

describe("renderWhitespace", () => {
  it("none leaves the line alone (tabs still expanded)", () => {
    expect(renderWhitespace("a b\tc", "none", { tabSize: 4 })).eq("a b c");
  });

  it("all shows every space and tab", () => {
    expect(renderWhitespace(" a b", "all", { tabSize: 4 })).eq("·a·b");
  });

  it("a tab is an arrow followed by the rest of its tab stop", () => {
    expect(renderWhitespace("\tx", "all", { tabSize: 4 })).eq("→   x");
  });

  it("boundary skips single spaces between words", () => {
    expect(renderWhitespace("a  b c", "boundary", { tabSize: 4 })).eq("a··b c");
  });

  it("boundary shows single leading and trailing spaces", () => {
    expect(renderWhitespace(" a b ", "boundary", { tabSize: 4 })).eq("·a b·");
  });

  it("trailing only shows white space at the end", () => {
    expect(renderWhitespace("a  b  ", "trailing", { tabSize: 4 })).eq("a  b··");
  });

  it("selection only shows white space inside the selection", () => {
    expect(
      renderWhitespace("a b c d", "selection", { tabSize: 4, selections: [[2, 5]] }),
    ).eq("a b·c d");
  });
});

describe("toggleRenderWhitespace", () => {
  it("switches the setting between none and all", () => {
    const vs = code("|a").setting("editor.renderWhitespace", "none");

    vs.run("editor.action.toggleRenderWhitespace");
    expect(vs.ctx.configuration.get("editor.renderWhitespace")).eq("all");

    vs.run("editor.action.toggleRenderWhitespace");
    expect(vs.ctx.configuration.get("editor.renderWhitespace")).eq("none");
  });
});
