import assert from "node:assert";
import { textEditorCommands } from "../Commands/editorCommands.js";
import type { EditorCommand } from "../Commands/Commands.js";
import { WINDOW_NAMES } from "../constants.js";
import colors from "../ui/colors.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { Textdocument, DiskFile } from "./Documents/TextDocument.js";
import { EditorContext } from "./Editor/Editor.js";
import { FileTreeWindow } from "./windows/FileTree/FileTreeWindow.js";
import { GitEditorWindow } from "./windows/GitEditorWindow.js";
import { StatusWindow } from "./windows/StatusEditor.js";
import { CodeEditorWindow } from "./windows/CodeEditorWindow.js";
import { LayoutEngine } from "../ui/layout/layout.js";
import { EditorRoot } from "./Editor/EditorRoot.js";
import { isTextComponent } from "../utils.js";
import { CodeEditorGroup } from "./windows/Tab/TabWindow.js";
import { UiPanel } from "../ui/components/UiComponent.js";
import { ErrorWindow } from "./windows/ErrorWindow.js";
import { logger } from "../logging/log.js";
import { ConsoleLogWindow } from "./windows/ConsoleLogWindow.js";
import { SecondarySidebar } from "./windows/SecondarySidebar.js";
import { PixelSize, WindowEvents } from "../Input/windowEvents.js";
import { WindowRenderer } from "../ui/Renderers/WindowRenderer.js";
import { WindowInputEvent, WindowInputParser } from "../Input/windowInput.js";

function setupGit(editor: EditorContext) {
  const codeGroup = editor.findWindow(CodeEditorGroup);
  assert(codeGroup, "text should be first");

  const gitEditor = new GitEditorWindow(editor.workspace());

  gitEditor
    .view()
    .setName(WINDOW_NAMES.GIT_WINDOW)
    .setBackgroundColor(colors.BLUE);

  editor.windowManager.split(codeGroup, gitEditor, "vertical");
}

function setupSecondarySideBar(editor: EditorContext) {
  const screen = new SecondarySidebar().setName(WINDOW_NAMES.SECONDARY_SIDEBAR);

  screen.view().setWidth("30%");

  const primary = editor.rootWindow.findChildrenByName(
    WINDOW_NAMES.PRIMARY_WINDOW,
  );

  editor.addWindow(screen);

  screen.view().setVisible(false).setBackgroundColor(colors.CYAN);
  assert(
    primary,
    `primary window not found. need to setup before calling this function`,
  );

  // hidden children take no space in the layout, so it can live in the tree
  // while closed; Ctrl+B only flips its visibility
  primary.addChildren(screen);
}

function setupWindows(editor: EditorContext) {
  const layout = editor.renderer.layout();

  editor.rootWindow = new EditorRoot().setLayout(layout);
  editor.rootWindow.setName("root_window");
}

function statusWindow(editor: EditorContext) {
  const statusWindow = new StatusWindow(editor);

  statusWindow
    .view()
    .setStyles(
      ComponentStyle.Create()
        .setBackgroundColor(colors.YELLOW)
        .setColor(colors.WHITE),
    )
    .setName(WINDOW_NAMES.STATUS_WINDOW)
    .setMaxHeight(null)
    .setHeight(statusWindow.view().lineHeight());

  editor.addWindow(statusWindow);
}

function editorWindow(editor: EditorContext) {
  const window = new UiPanel().setName(WINDOW_NAMES.PRIMARY_WINDOW);
  const layout = editor.renderer.layout();

  window.view().setLayout(editor.renderer.layout().clone());
  return window;
}
function setupFileTree(editor: EditorContext) {
  const treeView = new FileTreeWindow(editor.workspace() ?? process.cwd())
    .setIgnoreDirs(["node_modules", ".git", "dist"])
    .setIgnoreFileExt([".js.map"])
    .refresh();

  // 30 characters wide
  treeView
    .view()
    .setWidth(Math.ceil(30 * treeView.view().charWidth()))
    .setStyles(ComponentStyle.Create().setBackgroundColor(colors.MAGENTA))
    .setName(WINDOW_NAMES.TREE_WINDOW);

  editor.addWindow(treeView);
}

function setupTextEditor(editor: EditorContext) {
  const tab = new CodeEditorGroup();
  tab.setName("tab_editor_group");

  const editorWindow: CodeEditorWindow = new CodeEditorWindow(
    new Textdocument(new DiskFile("./src/globals.d.ts")),
  ).setName(WINDOW_NAMES.EDITOR_TEXT_WINDOW);

  tab.add(editorWindow.name(), editorWindow);

  editor.addWindow(editorWindow);
  editor.addWindow(tab);

  return editorWindow;
}

const visualModeCommands = {
  exit: {
    id: "visualMode.exit",
    title: "Visual Mode: Exit",
    description: "Drops the selection and goes back to normal mode (v).",
    run: (ctx: EditorContext) => {
      const textEditor = ctx.findWindow(CodeEditorWindow);
      textEditor?.cursor().clearSelection();
      ctx.setMode("normal");
    },
  },
  deleteSelection: {
    id: "visualMode.deleteSelection",
    title: "Visual Mode: Delete Selection",
    description: "Deletes the selected text and goes back to normal mode (d).",
    run: (ctx: EditorContext) => {
      const editor = ctx.getActiveWindow();
      if (!editor) return;
      isTextComponent(editor);
      const cursor = editor.cursor();
      const buffer = editor.buffer();

      const startPos = cursor.selection?.start();
      assert(startPos, "if visual mode has to have start position");

      const endPos = cursor.selection?.end();
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

      cursor.line = cursor.selection?.start().y ?? cursor.line;
      cursor.column = cursor.selection?.start().x ?? cursor.column;

      cursor.clearSelection();

      ctx.setMode("normal");
    },
  },
} satisfies Record<string, EditorCommand>;

function setupVisualModeCommands(editor: EditorContext) {
  editor.visualMode.bind(["j"], textEditorCommands.textEditor.moveDown);
  editor.visualMode.bind(["k"], textEditorCommands.textEditor.moveUp);
  editor.visualMode.bind(["h"], textEditorCommands.textEditor.moveLeft);
  editor.visualMode.bind(["l"], textEditorCommands.textEditor.moveRight);

  editor.visualMode.bind(["v"], visualModeCommands.exit);
  editor.visualMode.bind(["d"], visualModeCommands.deleteSelection);
}

const normalModeCommands = {
  visualMode: {
    id: "textEditor.visualMode",
    title: "Text Editor: Visual Mode",
    description: "Starts selecting text from the cursor (v).",
    run: (ctx: EditorContext) => {
      const textEditor = ctx.findWindow(CodeEditorWindow);
      textEditor?.cursor().startSelection();
      ctx.setMode("visual");
    },
  },
  visualLineMode: {
    id: "textEditor.visualLineMode",
    title: "Text Editor: Visual Line Mode",
    description: "Starts selecting whole lines from the cursor's line (V).",
    run: (ctx: EditorContext) => {
      const activeEditor = ctx.getActiveWindow();
      isTextComponent(activeEditor);

      const cursor = activeEditor.cursor();
      cursor.startSelection();
      cursor.selection?.setAnchor({
        x: 0,
        y: cursor.selection.anchor().y,
      });

      const buffer = activeEditor.buffer();
      const line = buffer.at(cursor.line);
      if (line === undefined) return;

      cursor.selection?.setHead({
        x: line.length,
        y: cursor.selection.head().y,
      });
      ctx.setMode("visual");
    },
  },
} satisfies Record<string, EditorCommand>;

const windowCommands = {
  toggleSecondarySidebar: {
    id: "window.toggleSecondarySidebar",
    title: "Window: Toggle Secondary Sidebar",
    description: "Opens or closes the sidebar on the right (Ctrl+B).",
    run: (ctx: EditorContext) => {
      const secondarySidebar = ctx.findWindow(SecondarySidebar);
      if (!secondarySidebar) {
        console.error("secondary sidebar not found");
        return;
      }
      if (ctx.windowManager.isActiveWindow(secondarySidebar)) {
        ctx.windowManager.close(secondarySidebar);
      } else {
        ctx.windowManager.open(secondarySidebar);
      }
    },
  },
  focusLeft: {
    id: "window.focusLeft",
    title: "Window: Focus Left",
    description: "Moves focus to the window on the left (Ctrl+W Ctrl+H).",
    run: (ctx: EditorContext) => {
      const success = ctx.windowManager.activateLeft();
      if (!success) {
        const previous = ctx.windowManager.previousWindow();
        if (previous) {
          ctx.windowManager.activate(previous);
          ctx.focus(previous);
        }
      } else {
        ctx.focus(success);
      }
    },
  },
  focusRight: {
    id: "window.focusRight",
    title: "Window: Focus Right",
    description: "Moves focus to the window on the right (Ctrl+W Ctrl+L).",
    run: (ctx: EditorContext) => {
      const window = ctx.windowManager.activateRight();
      if (window) {
        ctx.focus(window);
      }
    },
  },
  focusUp: {
    id: "window.focusUp",
    title: "Window: Focus Up",
    description: "Moves focus to the window above (Ctrl+W Ctrl+K).",
    run: (ctx: EditorContext) => {
      const window = ctx.windowManager.activateUp();

      if (window) {
        ctx.focus(window);
      }
    },
  },
  focusDown: {
    id: "window.focusDown",
    title: "Window: Focus Down",
    description: "Moves focus to the window below (Ctrl+W Ctrl+J).",
    run: (ctx: EditorContext) => {
      const success = ctx.windowManager.activateDown();
      if (!success) {
        const previous = ctx.windowManager.previousWindow();
        if (previous) ctx.focus(previous);
      } else {
        ctx.focus(success);
      }
    },
  },
  enter: {
    id: "window.enter",
    title: "Window: Enter",
    description:
      "Passes Enter to the focused window, like opening the file under the cursor in the file tree (Enter).",
    run: (ctx: EditorContext) => {
      const window = ctx.getActiveWindow();
      if (!window) {
        return;
      }
      window.defaultFocus()?.onEnter(ctx);
    },
  },
} satisfies Record<string, EditorCommand>;

function setupNormalModeCommands(editor: EditorContext) {
  editor.commandMode.bind("w", textEditorCommands.textEditor.saveFile);
  editor.commandMode.bind("wq", textEditorCommands.textEditor.saveFile);
  editor.normalMode.bind(["j"], textEditorCommands.textEditor.moveDown);
  editor.normalMode.bind(["k"], textEditorCommands.textEditor.moveUp);
  editor.normalMode.bind(["h"], textEditorCommands.textEditor.vimMoveLeft);
  editor.normalMode.bind(["l"], textEditorCommands.textEditor.moveRight);
  editor.normalMode.bind(["i"], textEditorCommands.textEditor.insertMode);
  editor.normalMode.bind(["a"], textEditorCommands.textEditor.insertAfter);
  editor.normalMode.bind(["r"], textEditorCommands.textEditor.renameCharacter);
  editor.normalMode.bind(["o"], textEditorCommands.textEditor.newLine);
  editor.normalMode.bind(["$"], textEditorCommands.textEditor.lineEnd);
  editor.normalMode.bind(["0"], textEditorCommands.textEditor.lineStart);
  editor.normalMode.bind(["w"], textEditorCommands.textEditor.nextWordStart);
  editor.normalMode.bind(["b"], textEditorCommands.textEditor.prevWordStart);
  editor.normalMode.bind(["G"], textEditorCommands.textEditor.goToDocumentEnd);
  editor.normalMode.bind(["<C-b>"], windowCommands.toggleSecondarySidebar);
  editor.normalMode.bind(["v"], normalModeCommands.visualMode);
  editor.normalMode.bind(["V"], normalModeCommands.visualLineMode);
  editor.normalMode.bind(
    ["g", "g"],
    textEditorCommands.textEditor.goToDocumentStart,
  );
  editor.normalMode
    .bind(["<C-w>", "<C-h>"], windowCommands.focusLeft)
    .bind(["<C-w>", "<C-l>"], windowCommands.focusRight)
    .bind(["<C-w>", "<C-k>"], windowCommands.focusUp)
    .bind(["<C-w>", "<C-j>"], windowCommands.focusDown);

  editor.normalMode.bind(
    ["W"],
    textEditorCommands.textEditor.nextCompleteWordStart,
  );
  editor.normalMode.bind([":"], textEditorCommands.textEditor.commandMode);
  editor.normalMode.bind(["<CR>"], windowCommands.enter);

  editor.normalMode.bind(["d", "d"], textEditorCommands.textEditor.deleteLine);
}





const commandLineCommands = {
  focusFileTree: {
    id: "window.focusFileTree",
    title: "Window: Focus File Tree",
    description: "Moves focus to the file tree (:tree).",
    run: (ctx: EditorContext) => {
      const fileTree = ctx.findWindow(FileTreeWindow);

      assert(fileTree, "invalid file tree and trying to active window");
      ctx.focus(fileTree);
    },
  },
  narrowCodeWindow: {
    id: "debug.narrowCodeWindow",
    title: "Debug: Narrow Code Window",
    description: "Sets the code window's width to 40 columns (:dec 10).",
    run: (ctx: EditorContext) => {
      const code = ctx.findWindow(CodeEditorWindow)!;

      code.view().setWidth(40);
    },
  },
  splitVertical: {
    id: "window.splitVertical",
    title: "Window: Split Vertically",
    description:
      "Splits the focused window, the new window below it (:split, :split v).",
    run: (ctx: EditorContext) => split(ctx, "vertical"),
  },
  splitHorizontal: {
    id: "window.splitHorizontal",
    title: "Window: Split Horizontally",
    description:
      "Splits the focused window, the new window beside it (:split h).",
    run: (ctx: EditorContext) => split(ctx, "horizontal"),
  },
  toggleTreeFolding: {
    id: "fileTree.toggleDefaultFolded",
    title: "File Tree: Toggle Folders Folded",
    description:
      "Switches whether the file tree folds folders by default (:u).",
    run: (ctx: EditorContext) => {
      const tree = ctx.findWindow(FileTreeWindow);
      if (!tree) {
        return;
      }
      tree.setDefaultFolded(!tree.defaultFolded());
    },
  },
  revealTreeNode: {
    id: "debug.revealTreeNode",
    title: "Debug: Reveal File Tree Node 80",
    description: "Scrolls the file tree to its 80th node (:sc 80).",
    run: (ctx: EditorContext) => {
      const tree = ctx.findWindow(FileTreeWindow);
      assert(tree, "invalid tree");

      const node = tree.getNodeAt(80);

      tree.reveal(node?.path!);
    },
  },
  quit: {
    id: "editor.quit",
    title: "Editor: Quit",
    description: "Closes the editor (:q).",
    // the exit handler in index.ts puts the terminal back the way it was
    run: () => process.exit(0),
  },
} satisfies Record<string, EditorCommand>;

function setupCommandModes(editor: EditorContext) {
  editor.commandMode.bind("tree", commandLineCommands.focusFileTree);
  editor.commandMode.bind("dec 10", commandLineCommands.narrowCodeWindow);
  editor.commandMode.bind("split", commandLineCommands.splitVertical);
  editor.commandMode.bind("split v", commandLineCommands.splitVertical);
  editor.commandMode.bind("split h", commandLineCommands.splitHorizontal);
  editor.commandMode.bind("u", commandLineCommands.toggleTreeFolding);
  editor.commandMode.bind("sc 80", commandLineCommands.revealTreeNode);
  editor.commandMode.bind("q", commandLineCommands.quit);
}

// puts every command in ctx.commands, so it can be run by its id
// (ctx.executeCommand) and listed by its title
function registerCommands(editor: EditorContext) {
  const groups = [
    textEditorCommands.textEditor,
    normalModeCommands,
    visualModeCommands,
    windowCommands,
    commandLineCommands,
  ];

  for (const group of groups) {
    for (const command of Object.values(group)) {
      editor.registerCommand(command);
    }
  }
}

function split(ctx: EditorContext, direction: DisplayDirection) {
  const active = ctx.getActiveWindow();
  if (!active) return;

  const demoWindow =
    ctx.windowManager.previousWindow(CodeEditorWindow) ||
    new CodeEditorWindow(new Textdocument(new DiskFile(".gitignore")));
  ctx.windowManager.split(active, demoWindow, direction);
  ctx.focus(demoWindow);
}



function errorWindow(ctx: EditorContext) {
  const errorWindow = new ErrorWindow(ctx);

  ctx.windowManager.add(errorWindow);

  ctx.rootWindow
    .findChildrenByName(WINDOW_NAMES.POPUP_WINDOW)
    ?.addChildren(errorWindow);
}

function debugWindow(ctx: EditorContext) {
  const secondary = ctx.rootWindow.findChildrenByName(
    WINDOW_NAMES.SECONDARY_SIDEBAR,
  );

  if (!secondary) {
    console.error("invalid secondary sidebar ");
    return;
  }

  const debugWindow = new ConsoleLogWindow();

  ctx.windowManager.add(debugWindow);

  secondary.addChildren(debugWindow);

  logger.subscribe(debugWindow.attachListener);
}

// lays the editor out to width x height: the renderer, and the tree it draws
function resizeToWindow(editor: EditorContext, width: number, height: number) {
  const layout = LayoutEngine.CreateBounds().setWidth(width).setHeight(height);
  editor.setLayout(layout);
  editor.rootWindow.layoutConstraints = LayoutEngine.CreateConstraints(
    width,
    height,
  );
  editor.rootWindow.setLayout(layout);
}

function connectWindow(editor: EditorContext, renderer: WindowRenderer) {
  editor.renderer = renderer;
  resizeToWindow(
    editor,
    renderer.window().pixelWidth,
    renderer.window().pixelHeight,
  );

  editor.requestRepaint();

  // like index.ts's process.stdin "data", for the window
  return new WindowEvents(renderer.window())
    .onInput((event) => windowInput(editor, event))
    .onResize((size) => windowResize(editor, size));
}

// a window event is zero or more editor keys: a letter's keyDown is none,
// its textInput is the letter
function windowInput(editor: EditorContext, event: WindowInputEvent) {
  for (const key of WindowInputParser.Parse(event)) {
    editor.handleKey(key);
  }
}

function windowResize(editor: EditorContext, size: PixelSize) {
  const layout = editor.layout();
  // SDL can report the same size again: no layout, no frame
  if (layout.width === size.pixelWidth && layout.height === size.pixelHeight) {
    return;
  }

  resizeToWindow(editor, size.pixelWidth, size.pixelHeight);
  editor.requestRepaint();
}

export const setupEditor = {
  root: setupWindows,
  commands: {
    register: registerCommands,
    normalMode: setupNormalModeCommands,
    commandMode: setupCommandModes,
    visualMode: setupVisualModeCommands,
  },
  window: {
    connect: connectWindow,
  },

  windows: {
    editor: editorWindow,
    status: statusWindow,
    git: setupGit,
    fileTree: setupFileTree,
    textEditor: setupTextEditor,
    debugWindow,
    errorWindow,
    setupSecondarySideBar,
  },
};
