import { UiComponent, UiPanel } from "../../ui/components/UiComponent.js";

export class SecondarySidebar extends UiPanel {
  defaultFocus(): UiComponent | null {
    return this.children().at(0)?.defaultFocus() || null;
  }
}
