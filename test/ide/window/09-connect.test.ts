import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupEditor } from "../../../src/Editor/setup/setupEditor.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { StatusWindow } from "../../../src/Editor/windows/StatusEditor.js";
import type { EditorCommand } from "../../../src/Commands/Commands.js";
import { vim } from "../harness.js";
import { FakeWindow } from "./helpers.js";

// Level 9: the editor running in a window, in-process. One call wires a
// WindowRenderer into an editor, next to the terminal setup:
//
//   setupEditor.window.connect(editor, renderer)
//
// It listens with a new WindowEvents(renderer.window()) (level 8), the way
// index.ts listens to process.stdin for the terminal, and after it:
//   - editor.renderer is the window renderer, so editor.render() and
//     editor.renderIfNeeded() (the frame loop in index.ts) draw to the window
//   - the editor is laid out in pixels, to the whole window
//   - keys typed in the window reach the editor (WindowInputParser, level 3)
//   - resizing the window lays the editor out again, like a browser does on
//     a new viewport: every new size, no grid to snap to
//   - nothing is written to the terminal (process.stdout), ever
//
// Like HTML, there are no rows: a line of text is renderer.lineHeight()
// pixels tall (CSS's line-height; 1 on the TerminalRenderer, where a line
// is a cell). The status bar is one line of text, so one lineHeight tall;
// the rest goes to the editor, like flex: 1.
//
//   renderer.lineHeight()   how tall one line of text is, in pixels
//
// Everything below is a real editor (test/ide/harness.ts) and a FakeWindow.
// The last level runs the real thing.

const WIDTH = 500;
const HEIGHT = 240;

function setup(text = "|abc") {
  const ide = vim(text);
  const window = new FakeWindow(WIDTH, HEIGHT);
  const renderer = new WindowRenderer(window);

  setupEditor.window.connect(ide, renderer);

  return { ide, window, renderer };
}

function statusHeight(ide: ReturnType<typeof vim>) {
  ide.screen(); // lays the editor out
  return ide.findWindow(StatusWindow)!.view().layout().height;
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

  it("the editor is laid out to the whole window, in pixels", () => {
    const { ide } = setup();

    expect(ide.renderer.layout().width).eq(WIDTH);
    expect(ide.renderer.layout().height).eq(HEIGHT);
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

    expect(window.lastFrame().width).eq(WIDTH);
    expect(window.lastFrame().height).eq(HEIGHT);
  });

  it("nothing changed: no frame", () => {
    const { ide, window } = setup();
    ide.renderIfNeeded();

    expect(ide.renderIfNeeded()).eq(false);
    expect(window.renders).toHaveLength(1);
  });

  it("the frame shows the editor: it isn't all one color", () => {
    const { ide, window } = setup("|hello");
    ide.renderIfNeeded();
    const frame = window.lastFrame();

    expect(frame.colors(0, 0, frame.width, frame.height).size).toBeGreaterThan(
      2,
    );
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
  it("a bigger window: the editor is laid out to it", () => {
    const { ide, window } = setup();
    window.resize(700, 400);

    expect(ide.renderer.layout().width).eq(700);
    expect(ide.renderer.layout().height).eq(400);
  });

  it("a smaller window: the editor is laid out to it", () => {
    const { ide, window } = setup();
    window.resize(300, 120);

    expect(ide.renderer.layout().width).eq(300);
    expect(ide.renderer.layout().height).eq(120);
  });

  it("any new size counts, even one pixel (no grid to snap to)", () => {
    const { ide, window } = setup();
    ide.renderIfNeeded();
    window.resize(WIDTH - 1, HEIGHT);

    expect(ide.renderer.layout().width).eq(WIDTH - 1);
    expect(ide.renderIfNeeded()).eq(true);
  });

  it("the next frame is the new window size", () => {
    const { ide, window } = setup();
    ide.renderIfNeeded();
    window.resize(700, 400);

    expect(ide.renderIfNeeded()).eq(true);
    expect(window.lastFrame().width).eq(700);
    expect(window.lastFrame().height).eq(400);
  });

  it("a resize to the same size doesn't draw again", () => {
    const { ide, window } = setup();
    ide.renderIfNeeded();
    window.resize(WIDTH, HEIGHT);

    expect(ide.renderIfNeeded()).eq(false);
    expect(window.renders).toHaveLength(1);
  });

  it("the document is still there after a resize", () => {
    const { ide, window } = setup("|keep me");
    window.resize(600, 300);

    expect(ide.lines()).toEqual(["keep me"]);
    expect(ide.screen().join("\n")).toContain("keep me");
  });
});
