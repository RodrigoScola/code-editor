import assert from "node:assert";
import { textEditorCommands } from "../Commands/editorCommands.js";
import { WINDOW_NAMES } from "../constants.js";
import { Canvas } from "../ui/canvas.js";
import colors from "../ui/colors.js";
import { DisplayComponent } from "../ui/components.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { Textdocument, DiskFile } from "./Documents/TextDocument.js";
import { EditorContext } from "./Editor/Editor.js";
import { FileTreeWindow } from "./windows/FileTreeWindow.js";
import { GitCommitWindow, GitEditorWindow } from "./windows/GitEditorWindow.js";
import { StatusWindow } from "./windows/StatusEditor.js";
import { TextEditorWindow } from "./windows/TextEditorWindow.js";
import { LayoutEngine } from "../ui/layout/layout.js";

function setupGit(editor: EditorContext) {
  const commit = new GitCommitWindow();

  commit.window
    .setVisible(false)
    .setPositionMode("absolute")
    .setIndex(5)
    .setMargin({ bottom: 2, left: 2, right: 2, top: 2 });

  const text = editor.findWindow(TextEditorWindow);
  assert(text, "text should be first");

  editor.addWindow(commit);

  const gitEditor = new GitEditorWindow();

  gitEditor.window
    .setName(WINDOW_NAMES.GIT_WINDOW)
    .setPadding({ left: 1, right: 0, bottom: 0, top: 0 })
    .styles()
    ?.setBackgroundColor(colors.BLUE_BACKGROUND);

  editor.windowManager.split(text, gitEditor, "vertical");
}

function setupWindows(editor: EditorContext) {
  editor.canvas = new Canvas().setLayout(editor.layout);
  editor.rootWindow = new DisplayComponent().setLayout(editor.layout);
}

function statusWindow(editor: EditorContext) {
  const statusWindow = new StatusWindow(editor);

  statusWindow.window
    .setPadding({ left: 1, right: 0, bottom: 0, top: 0 })
    .setMaxH(1)
    .setStyles(
      ComponentStyle.Create()
        .setBackgroundColor(colors.YELLOW_BACKGROUND)
        .setColor(colors.WHITE_FOREGROUND),
    )

    .setName(WINDOW_NAMES.STATUS_WINDOW);

  editor.addWindow(statusWindow);
}

function editorWindow(editor: EditorContext) {
  const window = new DisplayComponent().setLayout({
    ...editor.layout,
    height: editor.layout.height - 1,
  });
  return window;
}
function setupFileTree(editor: EditorContext) {
  const treeView = new FileTreeWindow(".")
    .setIgnoreDirs(["node_modules", ".git", "dist"])
    .setIgnoreFileExt([".js.map"]);

  treeView.window
    .setMaxW(30)
    .setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
    )
    .setName(WINDOW_NAMES.TREE_WINDOW);

  editor.addWindow(treeView);
}

function setupTextEditor(editor: EditorContext) {
  const editorWindow: TextEditorWindow = new TextEditorWindow(
    new Textdocument(new DiskFile("./src/globals.d.ts")),
  );

  editorWindow.window.setName(WINDOW_NAMES.EDITOR_TEXT_WINDOW);
  editor.addWindow(editorWindow);

  editorWindow.window.setStyles(
    ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
  );

  editorWindow.window.viewport().visibleLines =
    editorWindow.window.contentLayout().height;
}

function setupVisualModeCommands(editor: EditorContext) {
  editor.visualMode.bind(["j"], textEditorCommands.textEditor.moveDown);
  editor.visualMode.bind(["k"], textEditorCommands.textEditor.moveUp);
  editor.visualMode.bind(["h"], textEditorCommands.textEditor.moveLeft);
  editor.visualMode.bind(["l"], textEditorCommands.textEditor.moveRight);

  editor.visualMode.bind(["v"], (ctx) => {
    const textEditor = editor.findWindow(TextEditorWindow);
    textEditor?.cursor.clearSelection();
    ctx.setMode("normal");
  });

  editor.visualMode.bind(["d"], (ctx) => {
    const activeEditor = ctx.getActiveWindow();
    if (!activeEditor) return;
    const cursor = activeEditor.cursor;
    const buffer = activeEditor.buffer;

    const startPos = cursor.selection?.startSelection();
    assert(startPos, "if visual mode has to have start position");

    const endPos = cursor.selection?.endSelection();
    assert(endPos, "if visual mode has to have end position");

    if (startPos.y === endPos.y) {
      buffer.removeLine(startPos.y);
    }

    for (let i = startPos.y; i < endPos.y; i++) {
      const line = buffer.at(i) ?? " ";
      if (i === startPos.y || i === endPos.y) {
        let startAt = 0;
        let endAt = line.length;

        if (i === startPos.y) {
          endAt = startPos.x;
        } else {
          startAt = endPos.x;
        }

        const l = line?.slice(startAt, endAt);

        if (!l) {
          buffer.removeLine(startPos.y);
        } else {
          buffer.update(i, l);
        }
      } else {
        buffer.removeLine(i);
      }
    }

    cursor.line = cursor.selection?.startSelection().y ?? cursor.line;
    cursor.column = cursor.selection?.startSelection().x ?? cursor.column;

    cursor.clearSelection();

    ctx.setMode("normal");
  });
}

function setupNormalModeCommands(editor: EditorContext) {
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
  editor.normalMode.bind(["G"], textEditorCommands.textEditor.goToDocumentEnd);
  editor.normalMode.bind(["v"], (ctx) => {
    const textEditor = ctx.findWindow(TextEditorWindow);
    textEditor?.cursor.startSelection();
    ctx.setMode("visual");
  });

  editor.normalMode.bind(["V"], (ctx) => {
    const activeEditor = ctx.getActiveWindow();
    if (!activeEditor) return;

    const cursor = activeEditor.cursor;
    cursor.startSelection();
    cursor.selection?.setAnchor({
      x: 0,
      y: cursor.selection.anchor().y,
    });

    const buffer = activeEditor.buffer;
    const line = buffer.at(cursor.line);
    if (!line) return;

    cursor.selection?.setHead({
      x: line.length,
      y: cursor.selection.head().y,
    });
    ctx.setMode("visual");
  });
  editor.normalMode.bind(
    ["g", "g"],
    textEditorCommands.textEditor.goToDocumentStart,
  );
  editor.normalMode
    .bind(["<C-w>", "<C-h>"], (ctx: EditorContext) => {
      const success = ctx.windowManager.focusLeft();
      if (!success) {
        const previous = ctx.windowManager.previousWindow();
        if (previous) ctx.windowManager.focus(previous);
      }
    })
    .bind(["<C-w>", "<C-l>"], (ctx: EditorContext) => {
      ctx.windowManager.focusRight();
    })

    .bind(["<C-w>", "<C-k>"], (ctx: EditorContext) => {
      ctx.windowManager.focusUp();
    })
    .bind(["<C-w>", "<C-j>"], (ctx: EditorContext) => {
      const success = ctx.windowManager.focusDown();
      if (!success) {
        const previous = ctx.windowManager.previousWindow();
        if (previous) ctx.windowManager.focus(previous);
      }
    });

  editor.normalMode.bind(
    ["W"],
    textEditorCommands.textEditor.nextCompleteWordStart,
  );
  editor.normalMode.bind([":"], textEditorCommands.textEditor.commandMode);
  editor.normalMode.bind(["<CR>"], (ctx) => {
    const window = ctx.getActiveWindow();
    if (!window) {
      return;
    }
    window.onEnter(ctx);
  });

  editor.normalMode.bind(["d", "d"], textEditorCommands.textEditor.deleteLine);
}

function disableMouseEvents() {
  process.stdout.write("\x1b[?1000l");
  process.stdout.write("\x1b[?1006l");
}

function clearOutput() {
  process.stdout.write("\x1b[?1049l");
}

export function enableKeyboardProtocol() {
  process.stdout.write("\x1b[>1u");
}

export function disableKeyboardProtocol() {
  process.stdout.write("\x1b[<u");
}

async function handleResize(
  editor: EditorContext,
  size?: { columns: number; rows: number },
) {
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

function setupCommandModes(editor: EditorContext) {
  editor.commandMode.bind("tree", (ctx) => {
    const fileTree = ctx.findWindow(FileTreeWindow);

    assert(fileTree, "invalid file tree and trying to active window");
    editor.focus(fileTree);
  });

  editor.commandMode.bind("split", (ctx) => split(ctx, "vertical"));
  editor.commandMode.bind("split v", (ctx) => split(ctx, "vertical"));
  editor.commandMode.bind("split h", (ctx) => split(ctx, "horizontal"));
}

function split(ctx: EditorContext, direction: DisplayDirection) {
  const active = ctx.getActiveWindow();
  if (!active) return;

  const demoWindow =
    ctx.windowManager.previousWindow(TextEditorWindow) ||
    new TextEditorWindow(new Textdocument(new DiskFile(".gitignore")));
  ctx.windowManager.split(active, demoWindow, direction);
  ctx.focus(demoWindow);
}

export const setupEditor = {
  root: setupWindows,
  terminal: {
    clearOutput,
    disableMouseEvents,
    enableKeyboardProtocol,
    disableKeyboardProtocol,
    handleResize,
  },
  commands: {
    normalMode: setupNormalModeCommands,
    commandMode: setupCommandModes,
    visualMode: setupVisualModeCommands,
  },

  windows: {
    editor: editorWindow,
    status: statusWindow,
    git: setupGit,
    fileTree: setupFileTree,
    textEditor: setupTextEditor,
  },
};
