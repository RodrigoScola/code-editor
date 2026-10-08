import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Overtype mode (Insert key, "Toggle Overtype/Insert Mode"): typing replaces
// the character under the cursor instead of pushing it right. The status
// bar shows OVR while it is on.
//   editor.action.toggleOvertypeInsertMode
//   editor.overtypeOnPaste: pasting in overtype mode replaces too

const toggle = "editor.action.toggleOvertypeInsertMode";

describe("overtype mode", () => {
  it("typing replaces the character under the cursor", () => {
    expect(code("a|bc").run(toggle).type("X").state()).eq("aX|c");
  });

  it("typing at the end of the line still appends", () => {
    expect(code("ab|").run(toggle).type("X").state()).eq("abX|");
  });

  it("toggling again goes back to inserting", () => {
    expect(code("a|bc").run(toggle).run(toggle).type("X").state()).eq("aX|bc");
  });

  it("does not replace the line break", () => {
    expect(code("a|\nb").run(toggle).type("XY").lines()).toEqual(["aXY", "b"]);
  });

  it("the status line shows OVR", () => {
    const vs = code("a|bc", { width: 100 }).run(toggle);

    expect(vs.statusLine()).toContain("OVR");
  });

  it("pasting replaces too with overtypeOnPaste", () => {
    const vs = code("a|bcd").setting("editor.overtypeOnPaste", true).run(toggle);
    vs.ctx.clipboard.writeText("XY");

    expect(vs.run("editor.action.clipboardPasteAction").state()).eq("aXY|d");
  });
});
