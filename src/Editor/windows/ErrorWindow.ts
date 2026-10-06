import { UiComponent, UIScreen } from "../../ui/components/UiComponent.js";
import { EditorContext } from "../Editor/Editor.js";

export class ErrorWindow extends UIScreen {
  constructor(private ctx: EditorContext) {
    super();
    this.setCursorEnabled(false);

    this.view()
      .setWidth("50%")
      .setHeight("50%")
      .setIndex(10)
      .setStartX("20%")
      .setVisible(false)
      .setStartY("20%")
      .setPositionMode("absolute");
  }

  showError(message: string) {
    this.view().setVisible(true);
    this.setText(message);
  }
}
