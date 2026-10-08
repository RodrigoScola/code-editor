import { Ide, IdeOptions } from "../ide/harness.js";

// Harness for the VS Code feature specs. It builds on test/ide/harness.ts
// (a real EditorContext) and adds what VS Code-style features need:
//
// Selections. VS Code is selection based, and most commands act on every
// selection at once. In spec text:
//   |        a cursor (an empty selection)
//   «  »     a selection: « is the anchor, » is the active end (the cursor)
//            "«abc»" is selected left to right, "»abc«" right to left
// Any number of them means multiple cursors:
//   code("«foo» bar foo").run("editor.action.addSelectionToNextFindMatch")
//     .state()  ->  "«foo» bar «foo»"
// Literal "|", "«" and "»" can't appear in spec text.
//
// Commands. Everything is run by its VS Code command ID through the
// command registry (src/Commands/CommandRegistry.ts, see
// test/ide/workspace/command-palette.test.ts):
//   ctx.commands.execute(id, ctx, args?)
// Typing uses VS Code's own "type" command, so it works in any Vim mode.
//
// Proposed APIs the harness relies on:
//   codeWindow.selections() -> Selection[]   (the first is the primary one)
//   codeWindow.setSelections(selections)
//   ctx.configuration.update(key, value) / .get(key)   (settings, see
//     test/vscode/settings/configuration.test.ts)
//   ctx.clipboard.readText() / writeText(text)   (in memory in tests)

export type Position = { line: number; column: number };
export type Selection = { anchor: Position; active: Position };

export const CURSOR = "|";
export const ANCHOR = "«";
export const ACTIVE = "»";

export function parseSelections(text: string) {
  const selections: Selection[] = [];
  let content = "";
  let line = 0;
  let column = 0;
  let pending: { marker: string; at: Position } | null = null;

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
    throw new Error(`unpaired ${pending.marker} in spec text`);
  }

  return { content, selections };
}

const before = (a: Position, b: Position) =>
  a.line < b.line || (a.line === b.line && a.column < b.column);

export function renderSelections(content: string, selections: Selection[]) {
  const lines = content.split("\n");

  // markers to insert, applied right to left so columns stay valid
  const marks: { at: Position; text: string }[] = [];
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
    lines[at.line] = current.slice(0, at.column) + text + current.slice(at.column);
  }

  return lines.join("\n");
}

export function code(text: string, options: IdeOptions = {}) {
  return new Vs(text, options);
}

// shorthand: run commands on spec text and return the resulting spec text
//   expect(exec("a|b", "editor.action.copyLinesDownAction")).eq("ab\na|b")
export function exec(text: string, ...commands: string[]) {
  const vs = code(text);
  for (const command of commands) {
    vs.run(command);
  }
  return vs.state();
}

export class Vs {
  readonly ide: Ide;

  constructor(text: string, options: IdeOptions = {}) {
    const { content, selections } = parseSelections(text);
    this.ide = new Ide(content, options);
    if (selections.length > 0) {
      this.window().setSelections(selections);
    }
  }

  get ctx() {
    return this.ide.ctx;
  }

  window() {
    return this.ide.window();
  }

  run(command: string, args?: unknown) {
    this.ctx.commands.execute(command, this.ctx, args);
    return this;
  }

  type(text: string) {
    return this.run("type", { text });
  }

  setting(key: string, value: unknown) {
    this.ctx.configuration.update(key, value);
    return this;
  }

  selections(): Selection[] {
    return this.window().selections();
  }

  lines() {
    return this.ide.lines();
  }

  state() {
    return renderSelections(this.lines().join("\n"), this.selections());
  }

  // Vim keys still work, for features that have a Vim binding too
  keys(sequence: string) {
    this.ide.keys(sequence);
    return this;
  }

  statusLine() {
    return this.ide.statusLine();
  }

  screen() {
    return this.ide.screen();
  }

  // prints the frame (see Ide.show) and the text with selection markers
  show(label = "screen") {
    this.ide.show(label);
    console.log(`state (${label}):\n${this.state()}`);
    return this;
  }
}
