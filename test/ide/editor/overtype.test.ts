import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Overtype mode (Insert key, "Toggle Overtype/Insert Mode"): typing replaces
// the character under the cursor instead of pushing it right. The status
// bar shows OVR while it is on.
//   editor.action.toggleOvertypeInsertMode
//   editor.overtypeOnPaste: pasting in overtype mode replaces too

const toggle = "textEditor.toggleOvertype";

describe("overtype mode", () => {
  it("typing replaces the character under the cursor", () => {
    expect(code("a|bc").executeCommand(toggle).type("X").state()).eq("aX|c");
  });

  it("typing at the end of the line still appends", () => {
    expect(code("ab|").executeCommand(toggle).type("X").state()).eq("abX|");
  });

  it("toggling again goes back to inserting", () => {
    expect(code("a|bc").executeCommand(toggle).executeCommand(toggle).type("X").state()).eq("aX|bc");
  });

  it("does not replace the line break", () => {
    expect(code("a|\nb").executeCommand(toggle).type("XY").lines()).toEqual(["aXY", "b"]);
  });

  it("the status line shows OVR", () => {
    const ide = code("a|bc", { width: 100 }).executeCommand(toggle);

    expect(ide.statusLine()).toContain("OVR");
  });

  it("pasting replaces too with overtypeOnPaste", () => {
    const ide = code("a|bcd").setting("overtype_on_paste", true).executeCommand(toggle);
    ide.clipboard.writeText("XY");

    expect(ide.executeCommand("textEditor.paste").state()).eq("aXY|d");
  });
});
