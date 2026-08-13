import process from "process";
import readline from "node:readline";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent } from "./ui/components.js";
import colors from "./ui/colors.js";
import { LayoutEngine } from "./ui/layout/layout.js";
import { TextEditorWindow } from "./Editor/windows/TextEditorWindow.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { EditorContext } from "./Editor/Editor.js";
import { textEditorCommands } from "./Commands/editorCommands.js";
import { InputParser } from "./Input/inputParser.js";
import { WINDOW_NAMES } from "./constants.js";
import { DiskFile, Textdocument } from "./Editor/Documents/TextDocument.js";
import { FileTreeWindow } from "./Editor/windows/FileTreeWindow.js";
import { ComponentStyle } from "./ui/ComponentStyles.js";
import {
  GitCommitWindow,
  GitEditorWindow,
} from "./Editor/windows/GitEditorWindow.js";

// reset any mouse-tracking mode left on by a previous run that didn't exit
// cleanly (the terminal keeps this state, it isn't tied to our process)
disableMouseEvents();

enableKeyboardProtocol();

const editor = new EditorContext();

editor.gitCommit.window

  // .setVisible(false)
  .setPositionMode("absolute")
  .setIndex(2)
  .setMargin({ bottom: 2, left: 2, right: 2, top: 2 });

const gitEditor = new GitEditorWindow();

gitEditor.window.setName(WINDOW_NAMES.GIT_WINDOW);

editor.gitEditor = gitEditor;

gitEditor.window.styles()?.setBackgroundColor(colors.BLUE_BACKGROUND);

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

let layout = LayoutEngine.CreateBounds();
layout.height = process.stdout.rows;
layout.width = process.stdout.columns;

editor.canvas = new Canvas().setLayout(layout);

editor.rootWindow = new DisplayComponent().setLayout(layout);

const statusWindow: StatusWindow = new StatusWindow(editor);
statusWindow.window
  .setPadding({ left: 1, right: 0, bottom: 0, top: 0 })
  .setMaxH(1)
  .setStyles(
    ComponentStyle.Create()
      .setBackgroundColor(colors.YELLOW_BACKGROUND)
      .setColor(colors.WHITE_FOREGROUND),
  )
  .setName(WINDOW_NAMES.STATUS_WINDOW);

const window = new DisplayComponent().setLayout({
  ...layout,
  height: layout.height - 1,
});

editor.rootWindow.addChildren(window);
editor.rootWindow.addChildren(statusWindow.window);

window.setDirection("horizontal");

const treeView = new FileTreeWindow(".")
  .setIgnoreDirs(["node_modules", ".git", "dist"])
  .setIgnoreFileExt([".js.map"]);

treeView.window
  .setMaxW(30)
  .setStyles(
    ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
  )
  .setName(WINDOW_NAMES.TREE_WINDOW);

const divisor = new DisplayComponent();
divisor.setStyles(
  ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
);
divisor.setMaxW(1);

const editorWindow: TextEditorWindow = new TextEditorWindow(
  new Textdocument(new DiskFile(".gitignore")),
);

editorWindow.window.setName(WINDOW_NAMES.EDITOR_TEXT_WINDOW);

editor.textEditorWindow = editorWindow;
editor.statusWindow = statusWindow;
editor.activeWindow = editorWindow;

// todo: make a better function for this
editor.commandMode.bind("w", textEditorCommands.textEditor.saveFile);
editor.commandMode.bind("wq", textEditorCommands.textEditor.saveFile);
editor.normalMode.bind(["j"], textEditorCommands.textEditor.moveDown);
editor.normalMode.bind(["k"], textEditorCommands.textEditor.moveUp);
editor.normalMode.bind(["h"], textEditorCommands.textEditor.moveLeft);
editor.normalMode.bind(["l"], textEditorCommands.textEditor.moveRight);
editor.normalMode.bind(["i"], textEditorCommands.textEditor.insertMode);
editor.normalMode.bind(["a"], textEditorCommands.textEditor.insertAfter);
editor.normalMode.bind(["o"], textEditorCommands.textEditor.newLine);
editor.normalMode.bind(["$"], textEditorCommands.textEditor.goToEndLine);
editor.normalMode.bind(["0"], textEditorCommands.textEditor.goToBeginLine);
editor.normalMode.bind(["w"], textEditorCommands.textEditor.nextWordStart);
editor.normalMode.bind(["b"], textEditorCommands.textEditor.prevWordStart);
editor.normalMode.bind(["c", "m"], (ctx) => {
  ctx.gitCommit.window.setLayout({
    height: ctx.rootWindow.layout().height,
    width: ctx.rootWindow.layout().width,
    x: ctx.gitCommit.window.layout().x,
    y: ctx.gitCommit.window.layout().y,
  });
  ctx.focus(ctx.gitCommit);
  ctx.gitCommit.setVisible(!ctx.gitCommit.visible());

  console.log("this is good");
});
editor.normalMode.bind(["<C-w>", "<C-h>"], (ctx: EditorContext) => {
  editor.activeWindow = treeView;
});

editor.normalMode.bind(["<C-w>", "<C-l>"], (ctx: EditorContext) => {
  editor.activeWindow = gitEditor;
});
editor.normalMode.bind(
  ["W"],
  textEditorCommands.textEditor.nextCompleteWordStart,
);
editor.normalMode.bind([":"], textEditorCommands.textEditor.commandMode);
editor.normalMode.bind(["<CR>"], (ctx) => {
  if (!ctx.activeWindow) {
    return;
  }
  ctx.activeWindow.onEnter(ctx);
});

editor.normalMode.bind(["d", "d"], textEditorCommands.textEditor.deleteLine);

editor.commandMode.bind("tree", (ctx) => {
  editor.activeWindow = treeView;
});

editorWindow.window.setStyles(
  ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
);
editorWindow.viewPort.visibleColumns =
  editorWindow.window.contentLayout().width;
editorWindow.viewPort.visibleLines = editorWindow.window.contentLayout().height;

window
  .addChildren(treeView.window)
  .addChildren(divisor)
  .addChildren(editorWindow.window)
  .addChildren(gitEditor.window)
  .addChildren(editor.gitCommit.window);

const initialLayout = LayoutEngine.CreateBounds();

initialLayout.height = process.stdout.rows;
initialLayout.width = process.stdout.columns;

editor.canvas.setLayout(initialLayout);
editor.rootWindow.setLayout(initialLayout);

editor.requestRepaint();

process.stdout.on("resize", () => handleResize());

// Resize handling stays event-driven so normal typing is never paused by a
// background terminal-size probe.

function queryTerminalSize(
  timeoutMs = 150,
): Promise<{ columns: number; rows: number } | null> {
  return new Promise((resolve) => {
    let settled = false;
    let buffer = Buffer.alloc(0);

    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      const match = buffer.toString("utf8").match(/\x1b\[(\d+);(\d+)R/);

      if (!match) {
        return;
      }

      const rows = Number(match[1]);
      const columns = Number(match[2]);

      settle({
        rows,
        columns,
      });
    };

    const timer = setTimeout(() => {
      settle(null);
    }, timeoutMs);

    function settle(result: { columns: number; rows: number } | null) {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);
      process.stdin.off("data", onData);

      process.stdout.write("\x1b[u");

      resolve(result);
    }

    process.stdin.on("data", onData);

    process.stdout.write("\x1b[s" + "\x1b[999;999H" + "\x1b[6n");
  });
}

async function handleResize(size?: { columns: number; rows: number }) {
  const resolved = size ??
    (await queryTerminalSize()) ?? {
      columns: process.stdout.columns,
      rows: process.stdout.rows,
    };

  clearOutput();

  const resizedLayout = LayoutEngine.CreateBounds();
  resizedLayout.height = resolved.rows;
  resizedLayout.width = resolved.columns;
  editor.canvas.setLayout(resizedLayout);

  editor.rootWindow.setLayout(resizedLayout);

  editor.requestRepaint();
}

process.stdout.on("finish", () => {
  clearOutput();
  disableMouseEvents();
});

function dispatchKey(parsedKey: KeyEvent) {
  editor.handleKey(parsedKey);
  editor.requestRepaint();
}

process.stdin.on("data", (chunk) => {
  // real escape *sequences* (arrows, function keys, etc.) always arrive as
  // part of one multi-byte chunk written by the terminal in a single go, so
  // a lone single-byte ESC chunk reliably means the user just pressed
  // Escape by itself
  // old one ---
  // if (chunk.length === 1 && chunk[0] === 0x1b) {
  //   dispatchKey({
  //     token: DEFAULT_TOKENS.ESCAPE,
  //     ctrl: false,
  //     alt: false,
  //     shift: false,
  //   });
  // }

  const events = InputParser.parse(chunk);

  for (const event of events) {
    dispatchKey(event);
  }
});

function disableMouseEvents() {
  process.stdout.write("\x1b[?1000l");
  process.stdout.write("\x1b[?1006l");
}

function clearOutput() {
  process.stdout.write("\x1b[?1049l");
}

process.on("exit", () => {
  disableKeyboardProtocol();
});

//add a test case that the text color should not be reset after the letter color

// handy color palette for future components

export function enableKeyboardProtocol() {
  process.stdout.write("\x1b[>1u");
}
export function disableKeyboardProtocol() {
  process.stdout.write("\x1b[<u");
}

setInterval(() => {
  editor.requestRepaint();
}, 50);
