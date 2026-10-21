import { start } from "repl";
import { EditorContext } from "../../Editor/EditorContext.js";
import { isTextComponent } from "../../utils.js";

function copy(editor: EditorContext) {
  const activeEditor = editor.getFocusedComponent();
  isTextComponent(activeEditor);

  const cursor = activeEditor.cursor();
  const buffer = activeEditor.buffer();

  let text = buffer.at(cursor.line);

  const selection = cursor.selection;

  if (selection) {
    const start = selection!.start();

    const pos = selection.bufferPosition(buffer);

    text = buffer.range(pos.start, pos.end);
  }

  text && editor.clipboard.write(text);
}

function paste(editor: EditorContext) {
  const activeEditor = editor.getFocusedComponent();
  isTextComponent(activeEditor);

  const cursor = activeEditor.cursor();
  const buffer = activeEditor.buffer();

  let text = buffer.at(cursor.line);

  const selection = cursor.selection;

  if (selection) {
    activeEditor.replaceSelection(editor.clipboard.read());
  } else {

  }
}

function cut(editor: EditorContext) {
  const activeEditor = editor.getFocusedComponent();
  isTextComponent(activeEditor);

  const cursor = activeEditor.cursor();
  const buffer = activeEditor.buffer();

  let text = buffer.at(cursor.line);

  const selection = cursor.selection;

  if (selection) {
    text = activeEditor.deleteSelection();
  } else {
    text = buffer.removeLine(cursor.line);
  }

  editor.clipboard.write(text);
}
export const textCommands = {
  copy,
  cut,
  paste,
};
