import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { EditorContext } from "../../src/Editor/Editor/Editor.js";
import { setupEditor } from "../../src/Editor/setupEditor.js";
import { CodeEditorGroup } from "../../src/Editor/windows/Tab/TabWindow.js";
import { StatusWindow } from "../../src/Editor/windows/StatusEditor.js";
import { UiPanel } from "../../src/ui/components/UiComponent.js";
import { LayoutEngine } from "../../src/ui/layout/layout.js";
import { WINDOW_NAMES } from "../../src/constants.js";
import { parseSelections } from "../../src/Editor/textMarkers.js";

export { parseKeys } from "../../src/Input/keyNotation.js";
export { stripAnsi } from "../../src/ui/renderer.js";
export {
  ACTIVE,
  ANCHOR,
  CURSOR,
  parseSelections,
  renderSelections,
} from "../../src/Editor/textMarkers.js";
export type {
  TextPosition as Position,
  TextSelection as Selection,
} from "../../src/Editor/textMarkers.js";

// Builds a real editor for a spec and hands back its EditorContext. Every
// helper the specs use lives on EditorContext itself (src/Editor/Editor/
// Editor.ts), so the specs and the editor share one API:
//
//   const ide = vim("foo |bar baz");
//   ide.keys("dw");
//   expect(ide.text()).eq("foo |baz");
//
//   const ide = code("«foo» bar foo");
//   ide.executeCommand("textEditor.addSelectionToNextFindMatch");
//   expect(ide.state()).eq("«foo» bar «foo»");
//
// Start text is marked text (src/Editor/textMarkers.ts): "|" is a cursor,
// "«" and "»" are the anchor and the active end of a selection. In normal
// mode the cursor sits on the character after "|"; in insert mode it is the
// insertion point. Keys use Vim notation (src/Input/keyNotation.ts).

export type IdeOptions = {
  // the document's file name; the extension picks the language
  path?: string;
  width?: number;
  height?: number;
};

export function vim(text: string, options: IdeOptions = {}): EditorContext {
  const width = options.width ?? 40;
  const height = options.height ?? 10;

  const ctx = new EditorContext();
  ctx.renderer.setOutput(() => {});
  ctx.setLayout(LayoutEngine.CreateBounds(width, height));
  setupEditor.root(ctx);

  // root
  // ├── primary  (editor group)
  // └── status   (one row at the bottom)
  const primary = new UiPanel().setName(WINDOW_NAMES.PRIMARY_WINDOW);
  primary.view().setDirection("horizontal");

  const group = new CodeEditorGroup();
  group.setName("tab_editor_group");
  ctx.addWindow(group);
  primary.addChildren(group);

  setupEditor.windows.status(ctx);
  const status = ctx.findWindow(StatusWindow)!;

  ctx.rootWindow.addChildren(primary);
  ctx.rootWindow.addChildren(status);

  // the command-mode setup is left out on purpose: it binds :q to
  // process.exit, which would end the test run (test/setup.ts also makes
  // process.exit throw)
  setupEditor.commands.register(ctx);
  setupEditor.commands.normalMode(ctx);
  setupEditor.commands.visualMode(ctx);

  const { content, selections } = parseSelections(text);
  ctx.openMemoryFile(options.path ?? "test.txt", content);
  ctx.setSelections(selections);
  return ctx;
}

// the same editor; the name reads better for specs driven by commands
export const code = vim;

// shorthand for the most common Vim spec: start text, keys, resulting text
//   expect(after("foo |bar", "x")).eq("foo |ar")
export function after(text: string, keys: string, options: IdeOptions = {}) {
  return vim(text, options).keys(keys).text();
}

// shorthand for command specs: run commands, return the marked text
//   expect(exec("a|b", "textEditor.copyLinesDown")).eq("ab\na|b")
export function exec(text: string, ...commands: string[]) {
  const ctx = code(text);
  for (const command of commands) {
    ctx.executeCommand(command);
  }
  return ctx.state();
}

// splits "ab\nc|d" into its content and the cursor
export function parseCursor(text: string) {
  const { content, selections } = parseSelections(text);
  const cursor = selections[0]?.active ?? { line: 0, column: 0 };
  return { content, line: cursor.line, column: cursor.column };
}

// a real folder on disk for features that touch files; returns its path
export function workspace(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "ide-test-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}
