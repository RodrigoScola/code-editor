import { describe, expect, it } from "vitest";
import { TabComponent, TabWindow } from "./TabWindow.js";
import { DisplayComponent } from "../../../ui/components/components.js";
import { Canvas } from "../../../ui/canvas.js";
import { LayoutEngine } from "../../../ui/layout/layout.js";
import { Renderer } from "../../../ui/renderer.js";
import colors from "../../../ui/colors.js";
import { EditorRoot } from "../../Editor/EditorRoot.js";

describe("tests the tab component", () => {
  it("creates and shows tabs", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 30;

    const root = new EditorRoot().setLayout(layout);

    root.styles().setBackgroundColor(colors.RED_BACKGROUND);
    const canvas = new Canvas().setLayout(layout);

    const tabComponent = new TabComponent("title");
    tabComponent.window.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
    const tab = new TabWindow().add(tabComponent);

    tab.focus();

    tab.window.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);

    root.addChildren(tab.window);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.Create().build(root, canvas);

    expect(canvas.getCell(0, 0)?.styles.backgroundColor()).toBe(
      colors.BLUE_BACKGROUND,
    );
    expect(canvas.getCell(0, 0)?.styles.display()).toBe("t");

    canvas.renderBoard();
  });
});
