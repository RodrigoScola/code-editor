import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupEditor } from "../../../src/Editor/setupEditor.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import type { EditorCommand } from "../../../src/Commands/Commands.js";
import { vim } from "../harness.js";
import { cellCanvas, FakeWindow } from "./helpers.js";

// Level 9: the editor running in a window, in-process. One call wires a
// WindowRenderer into an editor, next to the terminal setup:
//
//   setupEditor.window.connect(editor, renderer)
//
// after which:
//   - editor.renderer is the window renderer, so editor.render() and
//     editor.renderIfNeeded() (the frame loop in index.ts) draw to the window
//   - the editor's layout is the window's grid (renderer.gridSize())
//   - keys typed in the window reach the editor (WindowInputParser, level 3)
//   - resizing the window lays the editor out again, only when the grid
//     changes
//   - nothing is written to the terminal (process.stdout), ever
//
// Everything below is a real editor (test/ide/harness.ts) and a FakeWindow.
// The last level runs the real thing.

const COLUMNS = 50;
const ROWS = 12;

function setup(text = "|abc") {
  const ide = vim(text);
  const probe = new WindowRenderer(cellCanvas(1, 1), new FakeWindow());
  const cw = probe.cellWidth();
  const ch = probe.cellHeight();

  // room for 50 x 12 cells and a bit, as a real window would have
  const window = new FakeWindow(COLUMNS * cw + 4, ROWS * ch + 7);
  const renderer = new WindowRenderer(cellCanvas(1, 1), window);
  setupEditor.window.connect(ide, renderer);

  return { ide, window, renderer, cw, ch };
}

// the editor must never write to the terminal while it runs in a window
let stdoutWrite: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  stdoutWrite = vi.spyOn(process.stdout, "write");
});
afterEach(() => {
  expect(stdoutWrite, "wrote to the terminal").not.toHaveBeenCalled();
});

describe("connecting", () => {
  it("the window renderer becomes editor.renderer", () => {
    const { ide, renderer } = setup();
    expect(ide.renderer).toBe(renderer);
  });

  it("the editor is laid out to the window's grid", () => {
    const { ide } = setup();

    expect(ide.renderer.layout().width).eq(COLUMNS);
    expect(ide.renderer.layout().height).eq(ROWS);
  });

  it("the screen is the window's grid", () => {
    const { ide } = setup();
    const screen = ide.screen();

    expect(screen).toHaveLength(ROWS);
    expect(screen.every((row) => row.length === COLUMNS)).eq(true);
  });

  it("the document shows on the screen", () => {
    const { ide } = setup("|hello window");
    expect(ide.screen().join("\n")).toContain("hello window");
  });

  it("asks for a first frame: the next tick draws", () => {
    const { ide, window } = setup();

    expect(ide.renderIfNeeded()).eq(true);
    expect(window.renders).toHaveLength(1);
  });

  it("doesn't draw until the frame loop runs", () => {
    const { window } = setup();
    expect(window.renders).toHaveLength(0);
  });
});

describe("the frame loop draws to the window", () => {
  it("each frame is the whole window", () => {
    const { ide, window } = setup();
    ide.renderIfNeeded();

    expect(window.lastFrame().width).eq(window.pixelWidth);
    expect(window.lastFrame().height).eq(window.pixelHeight);
  });

  it("nothing changed: no frame", () => {
    const { ide, window } = setup();
    ide.renderIfNeeded();

    expect(ide.renderIfNeeded()).eq(false);
    expect(window.renders).toHaveLength(1);
  });

  it("the frame shows the editor: its cells aren't all one color", () => {
    const { ide, window } = setup("|hello");
    ide.renderIfNeeded();
    const frame = window.lastFrame();

    expect(frame.colors(0, 0, frame.width, frame.height).size).toBeGreaterThan(2);
  });
});

describe("typing in the window", () => {
  it("normal mode: j moves down", () => {
    const { ide, window } = setup("|a\nb");
    window.type("j");

    expect(ide.cursor().line).eq(1);
  });

  it("insert mode: typed text lands in the document once", () => {
    const { ide, window } = setup("|abc");
    window.type("iX");
    window.keyDown("escape");

    expect(ide.lines()).toEqual(["Xabc"]);
    expect(ide.mode()).eq("normal");
  });

  it("command mode: :hello<CR> runs the command", () => {
    const { ide, window } = setup("|abc");
    let runs = 0;
    const hello: EditorCommand = {
      id: "test.hello",
      title: "Test: Hello",
      description: "Counts how often it ran (:hello).",
      run: () => {
        runs++;
      },
    };
    ide.commandMode.bind("hello", hello);

    window.type(":hello");
    window.keyDown("return");

    expect(runs).eq(1);
  });

  it("Ctrl keys arrive: a <C-y> binding runs", () => {
    const { ide, window } = setup("|abc");
    let runs = 0;
    const command: EditorCommand = {
      id: "test.ctrlY",
      title: "Test: Ctrl+Y",
      description: "Counts how often it ran (<C-y>).",
      run: () => {
        runs++;
      },
    };
    ide.normalMode.bind(["<C-y>"], command);

    window.keyDown("y", { ctrl: true });

    expect(runs).eq(1);
    expect(ide.lines()).toEqual(["abc"]);
  });

  it("a key asks for a frame, and the frame changes", () => {
    const { ide, window } = setup("|abc");
    ide.renderIfNeeded();
    const before = window.lastFrame().call.buffer;

    window.type("iX");
    expect(ide.renderIfNeeded()).eq(true);

    expect(window.lastFrame().call.buffer.equals(before)).eq(false);
  });

  it("the typed text is on the screen", () => {
    const { ide, window } = setup("|abc");
    window.type("iHello ");
    window.keyDown("escape");

    expect(ide.screen().join("\n")).toContain("Hello abc");
  });
});

describe("resizing the window", () => {
  it("a bigger window: more columns and rows", () => {
    const { ide, window, cw, ch } = setup();
    window.resize(70 * cw, 20 * ch);
    ide.renderIfNeeded();

    expect(ide.renderer.layout().width).eq(70);
    expect(ide.renderer.layout().height).eq(20);
    expect(ide.screen()).toHaveLength(20);
    expect(ide.screen()[0]).toHaveLength(70);
  });

  it("a smaller window: fewer columns and rows", () => {
    const { ide, window, cw, ch } = setup();
    window.resize(30 * cw, 6 * ch);

    expect(ide.screen()).toHaveLength(6);
    expect(ide.screen()[0]).toHaveLength(30);
  });

  it("the next frame is the new window size", () => {
    const { ide, window, cw, ch } = setup();
    ide.renderIfNeeded();
    window.resize(70 * cw, 20 * ch);

    expect(ide.renderIfNeeded()).eq(true);
    expect(window.lastFrame().width).eq(70 * cw);
    expect(window.lastFrame().height).eq(20 * ch);
  });

  it("a resize that doesn't change the grid doesn't lay out or draw again", () => {
    const { ide, window } = setup();
    ide.renderIfNeeded();

    // one pixel narrower: still 50 x 12 cells (setup left spare pixels)
    window.resize(window.pixelWidth - 1, window.pixelHeight - 1);

    expect(ide.renderIfNeeded()).eq(false);
    expect(window.renders).toHaveLength(1);
  });

  it("the document is still there after a resize", () => {
    const { ide, window, cw, ch } = setup("|keep me");
    window.resize(60 * cw, 15 * ch);

    expect(ide.lines()).toEqual(["keep me"]);
    expect(ide.screen().join("\n")).toContain("keep me");
  });
});
