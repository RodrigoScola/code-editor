import assert from "node:assert";
import { textEditorCommands } from "../Commands/editorCommands.js";
import { WINDOW_NAMES } from "../constants.js";
import { Canvas } from "../ui/canvas.js";
import colors from "../ui/colors.js";
import { DisplayComponent } from "../ui/components.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { Textdocument, DiskFile } from "./Documents/TextDocument.js";
import { EditorContext } from "./Editor.js";
import { FileTreeWindow } from "./windows/FileTreeWindow.js";
import { GitCommitWindow, GitEditorWindow } from "./windows/GitEditorWindow.js";
import { StatusWindow } from "./windows/StatusEditor.js";
import { TextEditorWindow } from "./windows/TextEditorWindow.js";
import { LayoutEngine } from "../ui/layout/layout.js";

function setupGit(editor: EditorContext) {
  editor.gitCommit = new GitCommitWindow();

  editor.gitCommit.window
    .setVisible(false)
    .setPositionMode("absolute")
    .setIndex(5)
    .setMargin({ bottom: 2, left: 2, right: 2, top: 2 });

  const gitEditor = new GitEditorWindow();

  gitEditor.window.setName(WINDOW_NAMES.GIT_WINDOW);

  editor.gitEditor = gitEditor;

  gitEditor.window.setPadding({ left: 1, right: 0, bottom: 0, top: 0 });

  gitEditor.window.styles()?.setBackgroundColor(colors.BLUE_BACKGROUND);
}

function setupWindows(editor: EditorContext) {
  editor.canvas = new Canvas().setLayout(editor.layout);
  editor.rootWindow = new DisplayComponent().setLayout(editor.layout);
}

function statusWindow(editor: EditorContext) {
  editor.statusWindow = new StatusWindow(editor);

  editor.statusWindow.window
    .setPadding({ left: 1, right: 0, bottom: 0, top: 0 })
    .setMaxH(1)
    .setStyles(
      ComponentStyle.Create()
        .setBackgroundColor(colors.YELLOW_BACKGROUND)
        .setColor(colors.WHITE_FOREGROUND),
    )
    .setName(WINDOW_NAMES.STATUS_WINDOW);
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

  editor.fileTree = treeView;
}

function setupDivisor() {
  const divisor = new DisplayComponent();
  divisor.setStyles(
    ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
  );
  divisor.setMaxW(1);

  return divisor;
}

function setupTextEditor(editor: EditorContext) {
  const editorWindow: TextEditorWindow = new TextEditorWindow(
    new Textdocument(new DiskFile(".gitignore")),
  );

  editorWindow.window.setName(WINDOW_NAMES.EDITOR_TEXT_WINDOW);
  editor.textEditor = editorWindow;

  editorWindow.window.setStyles(
    ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
  );

  editorWindow.window.viewport().visibleLines =
    editorWindow.window.contentLayout().height;
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
  editor.normalMode.bind(
    ["g", "g"],
    textEditorCommands.textEditor.goToDocumentStart,
  );
  editor.normalMode.bind(["c", "m"], (ctx) => {
    assert(ctx.gitCommit?.window, "invalid git commit window");
    ctx.gitCommit.window
      .setPadding({ bottom: 5, top: 5, left: 10, right: 10 })
      .setLayout({
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
    assert(ctx.fileTree, "invalid file tree and trying to active window");
    editor.activeWindow = ctx.fileTree;
  });

  editor.normalMode.bind(["<C-w>", "<C-l>"], (ctx: EditorContext) => {
    editor.activeWindow = ctx.gitEditor;
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
    assert(ctx.fileTree, "invalid file tree and trying to active window");
    editor.activeWindow = ctx.fileTree;
  });
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
  },

  windows: {
    editor: editorWindow,
    status: statusWindow,
    git: setupGit,
    fileTree: setupFileTree,
    divisor: setupDivisor,
    textEditor: setupTextEditor,
  },
};
