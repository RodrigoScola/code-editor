import { describe, expect, it } from "vitest";
import { EditorSelection } from "../../../../src/Editor/Selection.js";
import { TextBuffer } from "../../../../src/ui/buffer/Buffer.js";
import { UIScreen } from "../../../../src/ui/components/UiComponent.js";

// The selection itself, and editing a text view through it.
//
// EditorSelection (src/Editor/Selection.ts) has anchor/head and
// startSelection()/endSelection() (the earlier and later point). Proposed:
//   selection.isEmpty()      anchor and head are the same point
//   selection.isReversed()   the head is before the anchor (selected
//                            backwards, like "»abc«" in the specs)
//   selection.contains(point)   start <= point < end
//   selection.lines() -> [first line, last line]
//   selection.text(buffer) -> the selected text, lines joined with "\n"
//
// UIScreen (src/ui/components/UiComponent.ts), proposed:
//   screen.selectedText() -> "" when nothing is selected
//   screen.deleteSelection() -> the removed text; the cursor goes to where
//     the selection started and the selection is cleared. Does nothing
//     without a selection.
//   screen.replaceSelection(text) -> the cursor ends after the new text
//   screen.selectAll()
// Both use the TextBuffer range edits (test/unit/ui/buffer/buffer-edits.test.ts).

const p = (x: number, y: number) => ({ x, y });

describe("EditorSelection", () => {
  it("is empty when anchor and head are the same", () => {
    expect(new EditorSelection(p(2, 1), p(2, 1)).isEmpty()).eq(true);
    expect(new EditorSelection(p(2, 1), p(3, 1)).isEmpty()).eq(false);
  });

  it("is reversed when the head comes before the anchor", () => {
    expect(new EditorSelection(p(5, 0), p(1, 0)).isReversed()).eq(true);
    expect(new EditorSelection(p(1, 0), p(5, 0)).isReversed()).eq(false);
    expect(new EditorSelection(p(0, 2), p(9, 1)).isReversed()).eq(true);
  });

  it("start and end are in document order either way", () => {
    const selection = new EditorSelection(p(0, 2), p(9, 1));

    expect(selection.startSelection()).toEqual(p(9, 1));
    expect(selection.endSelection()).toEqual(p(0, 2));
  });

  it("contains the points from its start up to, not including, its end", () => {
    const selection = new EditorSelection(p(2, 0), p(1, 1));

    expect(selection.contains(p(2, 0))).eq(true);
    expect(selection.contains(p(40, 0))).eq(true);
    expect(selection.contains(p(0, 1))).eq(true);
    expect(selection.contains(p(1, 1))).eq(false);
    expect(selection.contains(p(1, 0))).eq(false);
  });

  it("an empty selection contains nothing", () => {
    expect(new EditorSelection(p(1, 0), p(1, 0)).contains(p(1, 0))).eq(false);
  });

  it("lines gives the first and last line", () => {
    expect(new EditorSelection(p(4, 3), p(0, 1)).lines()).toEqual([1, 3]);
  });

  it("text reads the selected text from a buffer", () => {
    const buffer = new TextBuffer("hello world\nsecond");

    expect(new EditorSelection(p(6, 0), p(3, 1)).text(buffer)).eq("world\nsec");
    expect(new EditorSelection(p(3, 1), p(6, 0)).text(buffer)).eq("world\nsec");
  });
});

// a text view with a selection from anchor to head
function screen(text: string, anchor: { x: number; y: number }, head: { x: number; y: number }) {
  const view = new UIScreen().setText(text);
  const cursor = view.cursor();
  cursor.line = head.y;
  cursor.column = head.x;
  cursor.selection = new EditorSelection(anchor, head);
  return view;
}

const content = (view: UIScreen) => view.buffer().content();

describe("selectedText", () => {
  it("is the selected text", () => {
    expect(screen("abc def", p(4, 0), p(7, 0)).selectedText()).eq("def");
  });

  it("is empty without a selection", () => {
    const view = new UIScreen().setText("abc");

    expect(view.selectedText()).eq("");
  });
});

describe("deleteSelection", () => {
  it("removes the selected text", () => {
    const view = screen("abc def", p(3, 0), p(7, 0));

    expect(view.deleteSelection()).eq(" def");
    expect(content(view)).eq("abc");
  });

  it("puts the cursor where the selection started", () => {
    const view = screen("abc\ndef\nghi", p(1, 0), p(2, 2));

    view.deleteSelection();

    expect(content(view)).eq("ai");
    expect([view.cursor().line, view.cursor().column]).toEqual([0, 1]);
  });

  it("works for a selection made backwards", () => {
    const view = screen("abc\ndef", p(2, 1), p(1, 0));

    view.deleteSelection();

    expect(content(view)).eq("af");
    expect([view.cursor().line, view.cursor().column]).toEqual([0, 1]);
  });

  it("clears the selection", () => {
    const view = screen("abc", p(0, 0), p(2, 0));

    view.deleteSelection();

    expect(view.cursor().selection).eq(null);
  });

  it("sets the preferred column, so moving down stays in that column", () => {
    const view = screen("abcdef\nabcdef", p(2, 0), p(5, 0));

    view.deleteSelection();
    view.moveCursorDown();

    expect(view.cursor().column).eq(2);
  });

  it("does nothing without a selection", () => {
    const view = new UIScreen().setText("abc");
    view.cursor().column = 1;

    expect(view.deleteSelection()).eq("");
    expect(content(view)).eq("abc");
  });

  it("an empty selection removes nothing and is cleared", () => {
    const view = screen("abc", p(1, 0), p(1, 0));

    view.deleteSelection();

    expect(content(view)).eq("abc");
    expect(view.cursor().selection).eq(null);
  });

  it("deleting everything leaves one empty line", () => {
    const view = screen("abc\ndef", p(0, 0), p(3, 1));

    view.deleteSelection();

    expect(view.buffer().count()).eq(1);
    expect(content(view)).eq("");
  });
});

describe("replaceSelection", () => {
  it("replaces the selected text", () => {
    const view = screen("hello world", p(6, 0), p(11, 0));

    view.replaceSelection("there");

    expect(content(view)).eq("hello there");
  });

  it("puts the cursor after the new text", () => {
    const view = screen("abc\ndef", p(1, 0), p(2, 1));

    view.replaceSelection("X\nYZ");

    expect(content(view)).eq("aX\nYZf");
    expect([view.cursor().line, view.cursor().column]).toEqual([1, 2]);
  });

  it("without a selection inserts at the cursor", () => {
    const view = new UIScreen().setText("ac");
    view.cursor().column = 1;

    view.replaceSelection("b");

    expect(content(view)).eq("abc");
  });
});

describe("selectAll", () => {
  it("selects from the start to the end of the last line", () => {
    const view = new UIScreen().setText("abc\nde");

    view.selectAll();

    expect(view.selectedText()).eq("abc\nde");
    expect(view.cursor().selection!.startSelection()).toEqual(p(0, 0));
    expect(view.cursor().selection!.endSelection()).toEqual(p(2, 1));
  });

  it("then deleteSelection empties the view", () => {
    const view = new UIScreen().setText("abc\nde");

    view.selectAll();
    view.deleteSelection();

    expect(content(view)).eq("");
  });
});
