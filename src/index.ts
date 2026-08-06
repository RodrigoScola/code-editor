import process from "process";
import readline from "node:readline";
import fs from "fs";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent } from "./ui/components.js";
import colors from "./ui/colors.js";
import { Renderer } from "./ui/renderer.js";
import { LayoutEngine } from "./ui/layout.js";
import { TextBuffer } from "./ui/buffer/Buffer.js";
import { TextEditorWindow } from "./Editor/windows/TextEditorWindow.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { EditorContext } from "./Editor/Editor.js";
import {
  deleteLine,
  editorInsertMode,
  editorInsertModeAfter,
  moveDownEditorCommand,
  moveLeftEditorCommand,
  moveRightEditorCommand,
  moveUpEditorCommand,
  newLineEditorCommand,
  setCommandMode,
} from "./Commands/editorCommands.js";
import { DEFAULT_TOKENS, InputParser } from "./Input/inputParser.js";
import { WINDOW_NAMES } from "./constants.js";
import {
  DiskFile,
  MemoryFile,
  Textdocument,
} from "./Editor/Documents/TextDocument.js";
import { FileTreeWindow } from "./Editor/windows/FileTreeWindow.js";

// reset any mouse-tracking mode left on by a previous run that didn't exit
// cleanly (the terminal keeps this state, it isn't tied to our process)
disableMouseEvents();

const editor = new EditorContext();

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

let layout = LayoutEngine.CreateBounds();
layout.height = process.stdout.rows;
layout.width = process.stdout.columns;

const cnv = new Canvas().setLayout(layout);
const root = new DisplayComponent().setLayout(layout);

const statusWindow = new StatusWindow(editor)
  .setPadding({ left: 1, right: 0, bottom: 0, top: 0 })
  .setMaxH(1)
  .setStyles({
    backgroundColor: colors.YELLOW_BACKGROUND,
    color: colors.WHITE_FOREGROUND,
  })
  .setName(WINDOW_NAMES.STATUS_WINDOW);

const window = new DisplayComponent().setLayout({
  ...layout,
  height: layout.height - 1,
});

root.addChildren(window);
root.addChildren(statusWindow);

window.setDirection("horizontal");

const treeView = new FileTreeWindow(".")
  .setIgnoreDirs(["node_modules", ".git", "dist"])
  .setIgnoreFileExt([".js.map"]);

treeView.setMaxW(30).setStyles({
  backgroundColor: colors.MAGENTA_BACKGROUND,
});

const divisor = new DisplayComponent();
divisor.setStyles({ backgroundColor: colors.YELLOW_BACKGROUND });
divisor.setMaxW(1);

const editorWindow: TextEditorWindow = new TextEditorWindow(
  new Textdocument(new DiskFile(".gitignore")),
);

editorWindow.setName(WINDOW_NAMES.EDITOR_TEXT_WINDOW);

editor.rootWindow = root;
editor.activeWindow = editorWindow;

// todo: make a better function for this
editor.normalMode.bind(["j"], moveDownEditorCommand);
editor.normalMode.bind(["k"], moveUpEditorCommand);
editor.normalMode.bind(["h"], moveLeftEditorCommand);
editor.normalMode.bind(["l"], moveRightEditorCommand);
editor.normalMode.bind(["i"], editorInsertMode);
editor.normalMode.bind(["a"], editorInsertModeAfter);
editor.normalMode.bind(["o"], newLineEditorCommand);
editor.normalMode.bind([":"], setCommandMode);

editor.normalMode.bind(["d", "d"], deleteLine);
editor.normalMode.bind(["r", "r"], () => {
  treeView.refresh();
});
editor.commandMode.bind("log", (ctx) => {
  console.log("this command is working");
});

function saveCommand(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  activeEditor.document.save();
}

editor.commandMode.bind("w", saveCommand);
editor.commandMode.bind("wq", saveCommand);

editorWindow.setStyles({ backgroundColor: colors.MAGENTA_BACKGROUND });
editorWindow.viewPort.visibleColumns = editorWindow.contentLayout().height;
editorWindow.viewPort.visibleLines = 3;

window.addChildren(treeView).addChildren(divisor).addChildren(editorWindow);

const initialLayout = LayoutEngine.CreateBounds();

initialLayout.height = process.stdout.rows;
initialLayout.width = process.stdout.columns;

cnv.setLayout(initialLayout);
root.setLayout(initialLayout);

LayoutEngine.Measure(root, root.contentLayout());

Renderer.build(root, cnv);

process.stdout.write("\x1b[H" + Renderer.render(cnv));

process.stdout.on("resize", () => handleResize());

// Resize handling stays event-driven so normal typing is never paused by a
// background terminal-size probe.

function queryTerminalSize(
  timeoutMs = 150,
): Promise<{ columns: number; rows: number } | null> {
  return new Promise((resolve) => {
    let settled = false;
    const onData = (chunk: Buffer) => {
      const match = chunk.toString("utf8").match(/\x1b\[(\d+);(\d+)R/);
      if (match) {
        settle({ rows: Number(match[1]), columns: Number(match[2]) });
      }
    };
    const timer = setTimeout(() => settle(null), timeoutMs);
    function settle(result: { columns: number; rows: number } | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stdin.off("data", onData);
      resolve(result);
    }
    process.stdin.on("data", onData);
    // save cursor, jump to a coordinate past any real terminal size (it
    // clamps to the actual last row/col), ask for the cursor position, then
    // restore the cursor to where it was
    process.stdout.write("\x1b[s\x1b[999;999H\x1b[6n\x1b[u");
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
  cnv.setLayout(resizedLayout);
  root.setLayout(resizedLayout);
  root.setStyles({ backgroundColor: colors.RED_BACKGROUND });
  LayoutEngine.Measure(root, root.contentLayout());

  Renderer.build(root, cnv);
  const out = Renderer.render(cnv);

  process.stdout.write("\x1b[H" + out);
}

process.stdout.on("finish", () => {
  clearOutput();
  disableMouseEvents();
});

function dispatchKey(parsedKey: KeyEvent) {
  editor.handleKey(parsedKey);

  LayoutEngine.Measure(root, root.contentLayout());
  Renderer.build(root, cnv);
  process.stdout.write("\x1b[H" + Renderer.render(cnv));
}

process.stdin.on("keypress", (str, key) => {
  const parsedKey = InputParser.ParseKey(str, key);

  // a standalone Escape byte is handled eagerly below, off the raw 'data'
  // event, since readline holds a lone ESC for up to ~500ms waiting to see
  // if more bytes follow before it fires this 'keypress' event
  if (parsedKey.token === DEFAULT_TOKENS.ESCAPE) {
    return;
  }

  dispatchKey(parsedKey);
});

process.stdin.on("data", (chunk) => {
  // real escape *sequences* (arrows, function keys, etc.) always arrive as
  // part of one multi-byte chunk written by the terminal in a single go, so
  // a lone single-byte ESC chunk reliably means the user just pressed
  // Escape by itself
  if (chunk.length === 1 && chunk[0] === 0x1b) {
    dispatchKey({
      token: DEFAULT_TOKENS.ESCAPE,
      ctrl: false,
      alt: false,
      shift: false,
    });
  }
});

function disableMouseEvents() {
  process.stdout.write("\x1b[?1000l");
  process.stdout.write("\x1b[?1006l");
}

function clearOutput() {
  process.stdout.write("\x1b[?1049l");
}

//add a test case that the text color should not be reset after the letter color

// handy color palette for future components
