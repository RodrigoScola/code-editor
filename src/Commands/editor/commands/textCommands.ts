import { start } from "repl";
import { EditorContext } from "../../../Editor/Editor/Editor.js";
import { isTextComponent } from "../../../utils.js";

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

  text && editor.clipboard.setText(text);
}
export const textCommands = {
  copy,
};
