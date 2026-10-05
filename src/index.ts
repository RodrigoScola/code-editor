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
import { CodeEditorGroup } from "./Editor/windows/Tab/TabWindow.js";

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
editor.rootWindow.addChildren(statusWindow.view());

// tree view

setup.windows.fileTree(editor);
const fileTree = editor.findWindow(FileTreeWindow);
assert(fileTree, "invalid file tree window");
window.addChildren(fileTree.view());
// ---------

// text editor
setup.windows.textEditor(editor);

const textEditor = editor.findWindow(CodeEditorWindow);

const tabEditor = editor.findWindow(CodeEditorGroup)!;
assert(textEditor, "invalid text editor window");

window.addChildren(tabEditor?.view());
// ---------

// git view
setup.windows.git(editor);
const gitCommit = editor.findWindow(GitCommitWindow);
const git = editor.findWindow(GitEditorWindow);
assert(gitCommit, "invalid git commit window");
// assert(git, "invalid git window");
// window.addChildren(git.window);
window.addChildren(gitCommit.view());

// todo: cleanup
const list = new ListMenuWindow();

list
  .view()
  .setWidth("50%")
  .setHeight("50%")
  .setIndex(10)
  .setStartX("20%")
  .setVisible(false)
  .setStartY("0%")
  .setPositionMode("absolute")
  .setBackgroundColor(colors.YELLOW_BACKGROUND);

list.view().border().setParameter(1);

editor.windowManager.add(list);
editor.rootWindow.addChildren(list.view());

// ---------

setup.commands.normalMode(editor);
setup.commands.visualMode(editor);
setup.commands.commandMode(editor);

editor.focus(fileTree);
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
