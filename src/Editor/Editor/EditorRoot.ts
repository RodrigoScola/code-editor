import { DisplayComponent } from "../../ui/components/displayComponent.js";
import { LayoutEngine } from "../../ui/layout/layout.js";
import { UiComponent } from "../../ui/components/UiComponent.js";
import { LayoutBounds } from "../../ui/layout/layoutStyle.js";

export class EditorRoot extends UiComponent {
  layoutConstraints: MeasureConstraints = LayoutEngine.CreateConstraints(0);

  setLayout(layout: LayoutBounds) {
    this.view().setLayout(layout);
    return this;
  }

  addWindow(editor: UiComponent) {
    this.addChildren(editor);
  }
}
