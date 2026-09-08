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

    const first = new TabComponent("title");
    first.window.border().setParameter(1);
    first.window
      .setMaxHeight(1 + first.window.border().vertical())
      .setMaxWidth("title".length + first.window.border().horizontal());

    first.window.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    const second = new TabComponent("second");
    second.window.styles().setBackgroundColor(colors.BLACK_BACKGROUND);
    second.window.border().setParameter(1);

    second.window
      .setMaxHeight(1 + second.window.border().vertical())
      .setMaxWidth("second".length + second.window.border().horizontal());

    const tab = new TabWindow().add(first).add(second);

    tab.titles.setMaxHeight(1 + first.window.border().vertical());

    tab.focus();

    root.addChildren(tab.window);

    expect(root.children().length == 1, "only has one child");
    expect(
      root.children().at(0)?.children().length == 2,
      "has the top and bottom",
    );

    first.buffer.addLine("this should be the content");

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.Create().build(root, canvas);
    canvas.renderBoard();

    expect(tab.titles?.contentLayout().height, "has to have same height").eq(
      first.window.layout().height,
    );
    expect(tab.board.layout().width).eq(layout.width);
  });
});
