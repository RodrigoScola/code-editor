import { DisplayComponent } from "../../ui/components/displayComponent.js";
import { LayoutEngine } from "../../ui/layout/layout.js";
import { UiComponent } from "../../ui/components/UiComponent.js";
import { LayoutBounds } from "../../ui/layout/LayoutBounds.js";

export class EditorRoot extends UiComponent {
  layoutConstraints: MeasureConstraints = LayoutEngine.CreateConstraints(0);

  setLayout(layout: LayoutBounds) {
    this.view().setLayout(layout);
    return this;
  }

  sendEvent(e: EditorEvents) {
    this.e(this, e);
  }
  private e(node: UiComponent, ev: EditorEvents) {
    node.onEvent(ev);

    for (const child of node.children()) {
      this.e(child, ev);
    }
  }

  addWindow(editor: UiComponent) {
    this.addChildren(editor);
  }
}
