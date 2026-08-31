import process from "process";
import readline from "node:readline";
import { LayoutEngine } from "./ui/layout/layout.js";
import { EditorContext } from "./Editor/Editor/Editor.js";
import { InputParser } from "./Input/inputParser.js";
import { assert } from "./assert.js";
import { setupEditor as setup } from "./Editor/setupEditor.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { FileTreeWindow } from "./Editor/windows/FileTreeWindow.js";
import { TextEditorWindow } from "./Editor/windows/TextEditorWindow.js";
import {
  GitCommitWindow,
  GitEditorWindow,
} from "./Editor/windows/GitEditorWindow.js";
import { ListMenuWindow } from "./Editor/windows/ListMenuWindow.js";
import colors from "./ui/colors.js";

// reset any mouse-tracking mode left on by a previous run that didn't exit
// cleanly (the terminal keeps this state, it isn't tied to our process)
setup.terminal.disableMouseEvents();
setup.terminal.enableKeyboardProtocol();

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

const editor = new EditorContext();

editor.layout = LayoutEngine.CreateBounds();
editor.layout.height = process.stdout.rows;
editor.layout.width = process.stdout.columns;

setup.root(editor);
setup.windows.status(editor);

const window = setup.windows.editor(editor).setDirection("horizontal");
editor.rootWindow.addChildren(window);

const statusWindow = editor.findWindow(StatusWindow);
assert(statusWindow, "status window not setup");
editor.rootWindow.addChildren(statusWindow.window);

// tree view

setup.windows.fileTree(editor);
const fileTree = editor.findWindow(FileTreeWindow);
assert(fileTree, "invalid file tree window");
window.addChildren(fileTree.window);
// ---------

// text editor
setup.windows.textEditor(editor);

const textEditor = editor.findWindow(TextEditorWindow);
assert(textEditor, "invalid text editor window");
window.addChildren(textEditor.window);
// ---------

// git view
setup.windows.git(editor);
const gitCommit = editor.findWindow(GitCommitWindow);
const git = editor.findWindow(GitEditorWindow);
assert(gitCommit, "invalid git commit window");
// assert(git, "invalid git window");
// window.addChildren(git.window);
window.addChildren(gitCommit.window);

// todo: cleanup
const list = new ListMenuWindow();

list.window
  .setLayout({
    height: 30,
    width: 90,
    x: 30,
    y: 0,
  })
  .setMaxW(30)
  .setIndex(10)
  .setPositionMode("absolute")
  .styles()
  ?.setBackgroundColor(colors.YELLOW_BACKGROUND);

editor.windowManager.add(list);
editor.rootWindow.addChildren(list.window);

// ---------

setup.commands.normalMode(editor);
setup.commands.visualMode(editor);
setup.commands.commandMode(editor);

editor.focus(textEditor);
editor.requestRepaint();

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
  for (const event of InputParser.parse(chunk)) {
    dispatchKey(event);
  }
});

process.on("exit", () => {
  setup.terminal.disableKeyboardProtocol();
});
