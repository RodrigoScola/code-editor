import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Column (box) selection.
//   cursorColumnSelectDown / Up / Left / Right      Shift+Alt+arrows
//   editor.action.toggleColumnSelection             Selection > Column Selection Mode
// In column selection mode, plain Shift+arrow selections make boxes too.

describe("column select commands", () => {
  it("cursorColumnSelectDown adds a cursor in the same column below", () => {
    expect(exec("a|bc\ndef", "cursorColumnSelectDown")).eq("a|bc\nd|ef");
  });

  it("cursorColumnSelectRight then Down makes a box", () => {
    expect(exec("|abc\ndef", "cursorColumnSelectRight", "cursorColumnSelectDown")).eq(
      "«a»bc\n«d»ef",
    );
  });

  it("cursorColumnSelectUp grows the box upward", () => {
    expect(exec("abc\nd|ef", "cursorColumnSelectUp")).eq("a|bc\nd|ef");
  });

  it("typing into a box types on every line", () => {
    const vs = code("|abc\ndef").run("cursorColumnSelectDown");

    expect(vs.type("X").state()).eq("X|abc\nX|def");
  });

  it("a box over three lines and two columns", () => {
    expect(
      exec(
        "|abc\ndef\nghi",
        "cursorColumnSelectRight",
        "cursorColumnSelectRight",
        "cursorColumnSelectDown",
        "cursorColumnSelectDown",
      ),
    ).eq("«ab»c\n«de»f\n«gh»i");
  });
});

describe("column selection mode", () => {
  it("makes Shift+Down select a column", () => {
    const vs = code("a|bc\ndef").run("editor.action.toggleColumnSelection");

    expect(vs.run("cursorDownSelect").state()).eq("a|bc\nd|ef");
  });

  it("toggling it off goes back to normal selections", () => {
    const vs = code("a|bc\ndef")
      .run("editor.action.toggleColumnSelection")
      .run("editor.action.toggleColumnSelection");

    expect(vs.run("cursorDownSelect").state()).eq("a«bc\nd»ef");
  });

  it("is a setting, so it shows in the configuration", () => {
    const vs = code("|a").run("editor.action.toggleColumnSelection");

    expect(vs.ctx.configuration.get("editor.columnSelection")).eq(true);
  });
});
