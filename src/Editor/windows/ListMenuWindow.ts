import colors from "../../ui/colors.js";
import { UIScreen } from "../../ui/components/UIScreen.js";
import { UiComponent } from "../../ui/components/UiComponent.js";
import { UiInput } from "../../ui/components/UiInput.js";
import { EditorContext } from "../Editor/Editor.js";

export class ListMenuWindow extends UIScreen {
  _input: UiInput;
  listDisplay: UiComponent = new UiComponent();
  constructor() {
    super();

    this.listDisplay.setText("first\nsecond\nthird").view();

    this.cursor().setBuffer(this.buffer());

    this._input = new UiInput();

    this._input
      .view()
      .setHeight(1)
      .setBackgroundColor(colors.BLUE)
      .setColor(colors.WHITE);

    this.view()
      .addChildren(this.listDisplay.view())
      .addChildren(this._input.view());
  }

  defaultFocus() {
    return this._input;
  }

  onEnter(ctx: EditorContext): void {
    const line = this.buffer().at(this.cursor().line);
  }
}
