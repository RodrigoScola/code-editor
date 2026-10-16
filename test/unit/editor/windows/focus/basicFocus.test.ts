import { describe, it } from "vitest";
import { DisplayComponent } from "../../../../../src/ui/display/displayComponent.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout";
import colors from "../../../../../src/ui/colors";
import { TerminalRenderer as Renderer } from "../../../../../src/ui/TerminalRenderer.js";
import { Canvas } from "../../../../../src/ui/canvas.js";

describe("basic focus", () => {
  it("basic focus", () => {
    const layout = LayoutEngine.CreateBounds(30);

    const root = new DisplayComponent()
      .setWidth(3)
      .setBackgroundColor(colors.RED_BACKGROUND);

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width, layout.height),
    ).Arrange(root);

    Renderer.Create(new Canvas(layout)).build(root).render();
  });
});
