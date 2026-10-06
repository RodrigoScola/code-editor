import colors from "../../ui/colors.js";
import { UiComponent } from "../../ui/components/UiComponent.js";
import { UiInput } from "../../ui/components/UiInput.js";
import { EditorContext } from "../Editor/Editor.js";

export class ListMenuWindow extends UiComponent {
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
      .setBackgroundColor(colors.BLACK_BACKGROUND)
      .setColor(colors.WHITE_FOREGROUND);

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
