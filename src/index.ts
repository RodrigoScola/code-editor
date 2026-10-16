import process from "process";
import readline from "node:readline";
import { LayoutEngine } from "./ui/layout/layout.js";
import { EditorContext } from "./Editor/Editor/Editor.js";
import { InputParser } from "./Input/inputParser.js";
import { assert } from "./assert.js";
import { setupEditor as setup } from "./Editor/setupEditor.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { FileTreeWindow } from "./Editor/windows/FileTree/FileTreeWindow.js";
import { GitEditorWindow } from "./Editor/windows/GitEditorWindow.js";
import { CodeEditorWindow } from "./Editor/windows/CodeEditorWindow.js";
import { CodeEditorGroup } from "./Editor/windows/Tab/TabWindow.js";
import { captureLogs, logger } from "./logging/log.js";
import { WINDOW_NAMES } from "./constants.js";
import { UIScreen } from "./ui/components/UIScreen.js";
import { TerminalRenderer } from "./ui/TerminalRenderer.js";

captureLogs((level, message) => logger.add(level, message));

// reset any mouse-tracking mode left on by a previous run that didn't exit
// cleanly (the terminal keeps this state, it isn't tied to our process)
setup.terminal.disableMouseEvents();
setup.terminal.enableKeyboardProtocol();
setup.terminal.enableMouseEvents();

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

const editor = new EditorContext();

// frames move the cursor to the cells they draw; a frame that changed
// nothing is "" and costs no write
if (editor.renderer.isTerminalRenderer()) {
  (editor.renderer as TerminalRenderer).setOutput((frame) => {
    if (frame) {
      process.stdout.write(frame);
    }
  });
}

// the editor paints its own cursor; the terminal's would sit wherever the
// last frame stopped drawing
setup.terminal.hideCursor();

const bounds = LayoutEngine.CreateBounds();
bounds.setHeight(process.stdout.rows).setWidth(process.stdout.columns);
editor.renderer.setLayout(bounds);

setup.root(editor);

// the folder the editor was started in is the project
editor.setWorkspace(process.cwd());

setup.windows.status(editor);

const window = setup.windows.editor(editor);
window.view().setDirection("horizontal");

assert(window.name()!.length > 0, "window has  to have a name");
editor.rootWindow.addChildren(window);

const popup = new UIScreen().setName(WINDOW_NAMES.POPUP_WINDOW);
popup.view().setPositionMode("absolute");

editor.rootWindow.addChildren(popup);

const statusWindow = editor.findWindow(StatusWindow);
assert(statusWindow, "status window not setup");
editor.rootWindow.addChildren(statusWindow);

// tree view

setup.windows.fileTree(editor);
const fileTree = editor.findWindow(FileTreeWindow);
assert(fileTree, "invalid file tree window");
window.addChildren(fileTree);
// ---------

// text editor
setup.windows.textEditor(editor);

const textEditor = editor.findWindow(CodeEditorWindow);

const tabEditor = editor.findWindow(CodeEditorGroup)!;
assert(textEditor, "invalid text editor window");

window.addChildren(tabEditor);
// ---------

// git view
setup.windows.git(editor);
const git = editor.findWindow(GitEditorWindow);
// assert(git, "invalid git window");
// window.addChildren(git.window);

setup.windows.setupSecondarySideBar(editor);

setup.windows.errorWindow(editor);
setup.windows.debugWindow(editor);

// ---------

setup.commands.register(editor);
setup.commands.normalMode(editor);
setup.commands.visualMode(editor);
setup.commands.commandMode(editor);

editor.focus(textEditor);
editor.requestRepaint();

setup.terminal.errorsOnScreen(editor);

process.stdout.on("resize", () => setup.terminal.handleResize(editor));

process.stdout.on("finish", () => {
  setup.terminal.clearOutput();
  setup.terminal.disableMouseEvents();
});

// the frame loop, like requestAnimationFrame: every tick draws a frame only
// if something asked for one (a key, a resize, git answering) or the layout
// changed, so an editor that sits still does no work
setInterval(() => {
  // the terminal hasn't taken the last frame yet; queueing more frames
  // behind it would only make the screen lag behind the keys
  if (process.stdout.writableNeedDrain) {
    return;
  }
  editor.renderIfNeeded();
}, 10);

// handleKey asks for a frame itself
function dispatchKey(parsedKey: KeyEvent) {
  editor.handleKey(parsedKey);
}

process.stdin.on("data", (chunk) => {
  for (const input of InputParser.parse(chunk)) {
    if (input.type === "keyboard") {
      dispatchKey(input.event);
    }
    // todo: mouse events are parsed but not dispatched yet
  }
});

process.on("exit", () => {
  setup.terminal.disableKeyboardProtocol();
  setup.terminal.disableMouseEvents();
  setup.terminal.showCursor();
});
