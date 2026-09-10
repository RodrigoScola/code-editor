import { DisplayComponent } from "../../ui/components/components.js";
import { LayoutEngine } from "../../ui/layout/layout.js";

export class EditorRoot extends DisplayComponent {
  layoutConstraints: MeasureConstraints = LayoutEngine.CreateConstraints(0);
}
