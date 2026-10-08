import process from "process";
import readline from "node:readline";
import { LayoutEngine } from "./ui/layout/layout.js";
import { EditorContext } from "./Editor/Editor/Editor.js";
import { InputParser } from "./Input/inputParser.js";
import { assert } from "./assert.js";
import { setupEditor as setup } from "./Editor/setupEditor.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { FileTreeWindow } from "./Editor/windows/FileTreeWindow.js";
import {
  GitCommitWindow,
  GitEditorWindow,
} from "./Editor/windows/GitEditorWindow.js";
import { ListMenuWindow } from "./Editor/windows/ListMenuWindow.js";
import colors from "./ui/colors.js";
import { CodeEditorWindow } from "./Editor/windows/CodeEditorWindow.js";
import { CodeEditorGroup, TabWindow } from "./Editor/windows/Tab/TabWindow.js";
import { captureLogs, logger } from "./logging/log.js";
import { ConsoleLogWindow } from "./Editor/windows/ConsoleLogWindow.js";
import { ErrorWindow } from "./Editor/windows/ErrorWindow.js";
import { UIScreen } from "./ui/components/UiComponent.js";
import { WINDOW_NAMES } from "./constants.js";

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

// draw every frame from the top left corner of the terminal
editor.renderer.setOutput((frame) => process.stdout.write("\x1b[H" + frame));

const bounds = LayoutEngine.CreateBounds();
bounds.height = process.stdout.rows;
bounds.width = process.stdout.columns;
editor.renderer.setLayout(bounds);

setup.root(editor);

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
const gitCommit = editor.findWindow(GitCommitWindow);
const git = editor.findWindow(GitEditorWindow);
assert(gitCommit, "invalid git commit window");
// assert(git, "invalid git window");
// window.addChildren(git.window);
window.addChildren(gitCommit);

setup.windows.setupSecondarySideBar(editor);

setup.windows.errorWindow(editor);
setup.windows.debugWindow(editor);

// ---------

setup.commands.normalMode(editor);
setup.commands.visualMode(editor);
setup.commands.commandMode(editor);

editor.focus(fileTree);
editor.requestRepaint();

setup.terminal.errorsOnScreen(editor);

process.stdout.on("resize", () => setup.terminal.handleResize(editor));

process.stdout.on("finish", () => {
  setup.terminal.clearOutput();
  setup.terminal.disableMouseEvents();
});

setInterval(() => {
  editor.requestRepaint();
}, 50);

function dispatchKey(parsedKey: KeyEvent) {
  editor.handleKey(parsedKey);
  editor.requestRepaint();
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
});
