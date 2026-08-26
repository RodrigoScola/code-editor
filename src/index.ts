import process from "process";
import readline from "node:readline";
import { LayoutEngine } from "./ui/layout/layout.js";
import { EditorContext } from "./Editor/Editor.js";
import { InputParser } from "./Input/inputParser.js";
import { assert } from "./assert.js";
import { setupEditor as setup } from "./Editor/setupEditor.js";

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

assert(editor.statusWindow, "status window not setup");
editor.rootWindow.addChildren(editor.statusWindow.window);

// tree view
setup.windows.fileTree(editor);
assert(editor.fileTree, "invalid file tree window");
window.addChildren(editor.fileTree.window);
// ---------

window.addChildren(setup.windows.divisor());

// text editor
setup.windows.textEditor(editor);

assert(editor.textEditor, "invalid text editor window");
window.addChildren(editor.textEditor.window);
// ---------

// git view
setup.windows.git(editor);
assert(editor.gitCommit, "invalid git commit window");
assert(editor.gitEditor, "invalid git editor window");
window.addChildren(editor.gitEditor.window);
window.addChildren(editor.gitCommit.window);
// ---------

setup.commands.normalMode(editor);
setup.commands.commandMode(editor);

editor.activeWindow = editor.textEditor;
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
