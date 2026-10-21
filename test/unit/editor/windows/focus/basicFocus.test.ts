import { describe, it } from "vitest";
import { DisplayComponent } from "../../../../../src/ui/display/displayComponent.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout";
import colors from "../../../../../src/ui/colors/colors";
import { TerminalRenderer as Renderer } from "../../../../../src/ui/Renderers/TerminalRenderer.js";
import { TerminalCanvas } from "../../../../../src/ui/Canvas/TerminalCanvas.js";

describe("basic focus", () => {
  it("basic focus", () => {
    const layout = LayoutEngine.CreateBounds(30);

    const root = new DisplayComponent()
      .setWidth(3)
      .setBackgroundColor(colors.RED);

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width, layout.height),
    ).Arrange(root);

    Renderer.Create(new TerminalCanvas(layout)).build(root).render();
  });
});
