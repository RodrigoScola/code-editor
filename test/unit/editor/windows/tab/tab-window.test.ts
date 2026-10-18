import { describe, expect, it } from "vitest";
import { TabWindow } from "../../../../../src/Editor/windows/Tab/TabWindow.js";
import { TerminalCanvas } from "../../../../../src/ui/Canvas/TerminalCanvas.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { TerminalRenderer as Renderer } from "../../../../../src/ui/Renderers/TerminalRenderer.js";
import colors from "../../../../../src/ui/colors.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import {
  MemoryFile,
  Textdocument,
} from "../../../../../src/Editor/Documents/TextDocument.js";
import { CodeEditorWindow } from "../../../../../src/Editor/windows/CodeEditorWindow.js";
import { DisplayComponent } from "../../../../../src/ui/display/displayComponent.js";

const createEditor = (content: string) => {
  return new CodeEditorWindow(
    new Textdocument(new MemoryFile("test", content)),
  );
};

const getRow = (dp: DisplayComponent, canvas: TerminalCanvas) =>
  canvas
    .getRow(dp.contentLayout().y)
    ?.map((cm) => cm.styles.display())
    .join("")
    .slice(dp.layout().x, dp.layout().x + dp.layout().width)
    .trim();
describe("tests the tab component", () => {
  it("shows the tab", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new TerminalCanvas().setLayout(layout);

    const root = new EditorRoot().setLayout(layout);

    const tab = new TabWindow();

    const editor = new CodeEditorWindow(
      new Textdocument(new MemoryFile("test", "this\nis\ncooo")),
    );
    editor.view().styles().setBackgroundColor(colors.PINK);

    root.addChildren(tab.view());

    tab.add("editor", editor);
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create(canvas).build(root);

    canvas.renderBoard();
  });

  it("switches to the right editor", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new TerminalCanvas().setLayout(layout);

    const root = new EditorRoot().setLayout(layout);

    const tab = new TabWindow();

    const editor = createEditor("this\nis\ncooo");
    const ed = createEditor("awesomesauce");

    tab.add("editor", editor);

    render(root.addChildren(tab.view()), canvas);
    expect(getRow(tab.displayContent.view(), canvas)).includes("this");

    tab.add("otherEditor", ed).focusWindow(ed);

    render(root, canvas);
    const out = getRow(tab.displayContent.view(), canvas);
    expect(getRow(tab.displayContent.view(), canvas)).includes("awesomesauce");
  });
});

function render(root: DisplayComponent, canvas: TerminalCanvas) {
  const cnc = LayoutEngine.CreateConstraints(canvas.layout().width);

  LayoutEngine.Measure(root, cnc).Arrange(root);
  Renderer.Create(canvas).build(root);

  canvas.renderBoard();
}
