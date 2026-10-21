// A way to write text together with its cursors and selections, so a
// document's state fits in one string:
//
//   |        a cursor (an empty selection)
//   «  »     a selection: « is the anchor, » is the active end (the cursor)
//            "«abc»" is selected left to right, "»abc«" right to left
//
//   "foo |bar"          the cursor before "b"
//   "«foo» bar «foo»"   two selections (multiple cursors)
//
// The tests use it to describe a document before and after an action
// (ctx.text(), ctx.state()). Literal "|", "«" and "»" can't be written in
// marked text.

export type TextPosition = { line: number; column: number };
export type TextSelection = { anchor: TextPosition; active: TextPosition };

export const CURSOR = "|";
export const ANCHOR = "«";
export const ACTIVE = "»";

// splits marked text into its content and its selections
export function parseSelections(text: string) {
  const selections: TextSelection[] = [];
  let content = "";
  let line = 0;
  let column = 0;
  let pending: { marker: string; at: TextPosition } | null = null;

  for (const ch of text) {
    const here = { line, column };

    if (ch === CURSOR) {
      selections.push({ anchor: here, active: here });
      continue;
    }

    if (ch === ANCHOR || ch === ACTIVE) {
      if (!pending) {
        pending = { marker: ch, at: here };
      } else {
        const first = pending.at;
        selections.push(
          pending.marker === ANCHOR
            ? { anchor: first, active: here }
            : { anchor: here, active: first },
        );
        pending = null;
      }
      continue;
    }

    content += ch;
    if (ch === "\n") {
      line++;
      column = 0;
    } else {
      column++;
    }
  }

  if (pending) {
    throw new Error(`unpaired ${pending.marker} in marked text`);
  }

  return { content, selections };
}

const before = (a: TextPosition, b: TextPosition) =>
  a.line < b.line || (a.line === b.line && a.column < b.column);

// the opposite of parseSelections: puts the markers back into the content
export function renderSelections(content: string, selections: TextSelection[]) {
  const lines = content.split("\n");

  // markers to insert, applied right to left so columns stay valid
  const marks: { at: TextPosition; text: string }[] = [];
  for (const { anchor, active } of selections) {
    if (anchor.line === active.line && anchor.column === active.column) {
      marks.push({ at: active, text: CURSOR });
    } else {
      marks.push({ at: anchor, text: ANCHOR });
      marks.push({ at: active, text: ACTIVE });
    }
  }

  marks.sort((a, b) => (before(a.at, b.at) ? 1 : before(b.at, a.at) ? -1 : 0));

  for (const { at, text } of marks) {
    const current = lines[at.line] ?? "";
    lines[at.line] =
      current.slice(0, at.column) + text + current.slice(at.column);
  }

  return lines.join("\n");
}
