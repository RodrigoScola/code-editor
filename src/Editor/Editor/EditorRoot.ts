import { DisplayComponent } from "../../ui/components/components.js";
import { LayoutEngine } from "../../ui/layout/layout.js";
import { EditorWindow } from '../windows/EditorWindow.js';

export class EditorRoot extends DisplayComponent {
  layoutConstraints: MeasureConstraints = LayoutEngine.CreateConstraints(0);

  addWindow(editor: EditorWindow) {
    this.addChildren(editor.view());
  }
}
