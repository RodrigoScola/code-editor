import { describe, expect, it } from "vitest";
import { EditorContext } from "../Editor/Editor/Editor.js";
import { Textdocument, MemoryFile } from "../Editor/Documents/TextDocument.js";
import { TextEditorWindow } from "../Editor/windows/TextEditorWindow.js";
import { DisplayComponent } from "../ui/components.js";
import { WINDOW_NAMES } from "../constants.js";
import { textEditorCommands } from "./editorCommands.js";

describe("textEditorCommands", () => {
  it("moves to the start of the next word", () => {
    const { ctx, editorWindow } = setupContext({ fileContent: "foo bar baz" });

    textEditorCommands.textEditor.nextWordStart(ctx);

    expect(editorWindow.cursor.column).toBe(4);
    expect(editorWindow.cursor.prefferedColumn).toBe(4);
  });

  it("moves to the start of the next whitespace-separated word", () => {
    const { ctx, editorWindow } = setupContext({ fileContent: "foo,bar baz" });

    textEditorCommands.textEditor.nextCompleteWordStart(ctx);

    expect(editorWindow.cursor.column).toBe(8);
    expect(editorWindow.cursor.prefferedColumn).toBe(8);
  });
  it("puts the cursor on the opening parenthesis", () => {
    const { ctx, editorWindow } = setupContext({
      fileContent: "thing1 () thing2()",
    });

    textEditorCommands.textEditor.nextWordStart(ctx);

    expect(editorWindow.cursor.column).toBe(7);
  });

  it("moves from a word to the dot and then to the next word in filenames", () => {
    const { ctx, editorWindow } = setupContext({ fileContent: "out.txt" });

    textEditorCommands.textEditor.nextWordStart(ctx);
    expect(editorWindow.cursor.column).toBe(3);

    textEditorCommands.textEditor.nextWordStart(ctx);
    expect(editorWindow.cursor.column).toBe(4);
  });

  it("moves to the next line when there is no next word on the current line", () => {
    const { ctx, editorWindow } = setupContext({ fileContent: "foo\nbar" });

    editorWindow.cursor.column = 2;

    textEditorCommands.textEditor.nextWordStart(ctx);

    expect(editorWindow.cursor.line).toBe(1);
    expect(editorWindow.cursor.column).toBe(0);
  });

  it("moves from a word to the dot and then to the next word in filenames", () => {
    const { ctx, editorWindow } = setupContext({ fileContent: "out.txt" });

    textEditorCommands.textEditor.nextWordStart(ctx);
    expect(editorWindow.cursor.column).toBe(3);

    textEditorCommands.textEditor.nextWordStart(ctx);
    expect(editorWindow.cursor.column).toBe(4);
  });
  it("moves to a previous word start", () => {
    const sentence = "simple word";

    const { ctx, editorWindow } = setupContext({ fileContent: sentence });

    editorWindow.cursor.column = sentence.length - 1;
    textEditorCommands.textEditor.prevWordStart(ctx);

    console.log(sentence[editorWindow.cursor.column], "this ");

    expect(editorWindow.cursor.column).eq(7);
  });
  it("moves previous word start with punctuation", () => {
    const sentence = "things.md";

    const { ctx, editorWindow } = setupContext({ fileContent: sentence });

    editorWindow.cursor.column = sentence.indexOf(".");

    textEditorCommands.textEditor.prevWordStart(ctx);
    console.log(sentence[editorWindow.cursor.column], "this ");

    expect(editorWindow.cursor.column).eq(0);
  });
});

function setupContext({ fileContent }: { fileContent: string }) {
  const ctx = new EditorContext();
  const root = new DisplayComponent();
  const editorWindow = new TextEditorWindow(
    new Textdocument(new MemoryFile("doc", fileContent)),
  );

  editorWindow.window.setName(WINDOW_NAMES.EDITOR_TEXT_WINDOW);
  root.addChildren(editorWindow.window);

  ctx.rootWindow = root;
  ctx.addWindow(editorWindow).focus(editorWindow);

  editorWindow.cursor.column = 0;
  return {
    ctx,
    root,
    editorWindow,
  };
}
