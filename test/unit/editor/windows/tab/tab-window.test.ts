import { describe, expect, it } from "vitest";
import { TabWindow } from "../../../../../src/Editor/windows/Tab/TabWindow.js";
import { Canvas } from "../../../../../src/ui/canvas.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../../src/ui/renderer.js";
import colors from "../../../../../src/ui/colors.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import {
  MemoryFile,
  Textdocument,
} from "../../../../../src/Editor/Documents/TextDocument.js";
import { CodeEditorWindow } from "../../../../../src/Editor/windows/CodeEditorWindow.js";
import { DisplayComponent } from "../../../../../src/ui/components/displayComponent.js";

const createEditor = (content: string) => {
  return new CodeEditorWindow(
    new Textdocument(new MemoryFile("test", content)),
  );
};

const getRow = (dp: DisplayComponent, canvas: Canvas) =>
  canvas
    .getRow(dp.contentLayout().y)
    ?.map((cm) => cm.styles.display())
    .join("")
    .slice(dp.layout().x, dp.layout().x + dp.layout().width)
    .trim();
describe("tests the tab component", () => {
  it("shows the tab", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const root = new EditorRoot().setLayout(layout);

    const tab = new TabWindow();

    const editor = new CodeEditorWindow(
      new Textdocument(new MemoryFile("test", "this\nis\ncooo")),
    );
    editor.view().styles().setBackgroundColor(colors.PINK_BACKGROUND);

    root.addChildren(tab.view());

    tab.add("editor", editor);
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });

  it("switches to the right editor", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

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
    console.log(tab.displayContent.children()[0].name());
    console.log(out);
    expect(getRow(tab.displayContent.view(), canvas)).includes("awesomesauce");
  });
});

function render(root: DisplayComponent, canvas: Canvas) {
  const cnc = LayoutEngine.CreateConstraints(canvas.layout().width);

  LayoutEngine.Measure(root, cnc).Arrange(root);
  Renderer.Create().build(root, canvas);

  canvas.renderBoard();
}
