import { describe, expect, it } from "vitest";
import { EditorContext } from "../../../../../src/Editor/Editor/Editor";
import { UiComponent } from "../../../../../src/ui/components/UiComponent.js";
import { UiInput } from "../../../../../src/ui/components/UiInput.js";
import { DisplayComponent } from "../../../../../src/ui/components/displayComponent.js";
import { LayoutDimensions } from "../../../../../src/ui/layout/LayoutDimensions";
import { LayoutEngine } from "../../../../../src/ui/layout/layout";
import colors from "../../../../../src/ui/colors";
import { Focusable } from "../../../../../src/ui/windows/FocusManager";

class InputWindow extends UiComponent {
  _input: UiInput;
  constructor(input: UiInput) {
    super();
    this._input = input;
    this.addChildren(this._input);
  }
  defaultFocus(): Focusable {
    return this._input;
  }
}

describe("basic focus", () => {
  it("basic focus", () => {
    const editor = new EditorContext();
    editor.rootWindow.setLayout(LayoutEngine.CreateBounds(30));
    editor.canvas.setLayout(LayoutEngine.CreateBounds(30));
    const inputA = new UiInput();
    const inputB = new UiInput();
    const windowA = new InputWindow(inputA);

    const windowB = new InputWindow(inputB);

    windowA.view().setBackgroundColor(colors.YELLOW_BACKGROUND);
    windowB.view().setBackgroundColor(colors.BLUE_BACKGROUND);

    editor.rootWindow.view().logChildren();
    editor.rootWindow.addChildren(windowA);
    editor.rootWindow.addChildren(windowB);

    editor.addWindow(windowA);
    editor.addWindow(windowB);
    editor.focus(windowA);

    editor.requestRepaint();
    editor.canvas.renderBoard();

    expect(editor.focusManager.active()).eq(inputA);
  });
});
