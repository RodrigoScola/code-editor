import { describe, expect, it } from "vitest";
import { EditorContext } from "../../../../../src/Editor/Editor/Editor";
import { EditorWindow } from "../../../../../src/Editor/windows/EditorWindow";
import { InputComponent } from "../../../../../src/ui/components/Input";
import { DisplayComponent } from "../../../../../src/ui/components/components";
import { LayoutDimensions } from "../../../../../src/ui/layout/LayoutDimensions";
import { LayoutEngine } from "../../../../../src/ui/layout/layout";
import colors from "../../../../../src/ui/colors";
import { Focusable } from "../../../../../src/ui/windows/FocusManager";

class InputWindow extends EditorWindow {
  _input: InputComponent;
  constructor(input: InputComponent) {
    super();
    this._input = input;
    this.view().addChildren(this._input);
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
    const inputA = new InputComponent();
    const inputB = new InputComponent();
    const windowA = new InputWindow(inputA);

    const windowB = new InputWindow(inputB);

    windowA.view().setBackgroundColor(colors.YELLOW_BACKGROUND);
    windowB.view().setBackgroundColor(colors.BLUE_BACKGROUND);

    editor.rootWindow.logChildren(0);
    editor.rootWindow.addChildren(windowA.view());
    editor.rootWindow.addChildren(windowB.view());

    editor.addWindow(windowA);
    editor.addWindow(windowB);
    editor.focus(windowA);

    editor.requestRepaint();
    editor.canvas.renderBoard();

    expect(editor.focusManager.active()).eq(inputA);
  });
});
