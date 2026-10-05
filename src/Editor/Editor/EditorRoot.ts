import { DisplayComponent } from "../../ui/components/displayComponent.js";
import { LayoutEngine } from "../../ui/layout/layout.js";
import { UiComponent } from "../../ui/components/UiComponent.js";

export class EditorRoot extends DisplayComponent {
  layoutConstraints: MeasureConstraints = LayoutEngine.CreateConstraints(0);

  addWindow(editor: UiComponent) {
    this.addChildren(editor.view());
  }
}
