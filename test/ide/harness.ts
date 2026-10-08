import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { EditorContext } from "../../src/Editor/Editor/Editor.js";
import { setupEditor } from "../../src/Editor/setupEditor.js";
import {
  MemoryFile,
  Textdocument,
} from "../../src/Editor/Documents/TextDocument.js";
import { CodeEditorWindow } from "../../src/Editor/windows/CodeEditorWindow.js";
import { CodeEditorGroup } from "../../src/Editor/windows/Tab/TabWindow.js";
import { StatusWindow } from "../../src/Editor/windows/StatusEditor.js";
import {
  UiComponent,
  UiPanel,
  UIScreen,
} from "../../src/ui/components/UiComponent.js";
import { Canvas } from "../../src/ui/canvas.js";
import { DisplayComponent } from "../../src/ui/components/displayComponent.js";
import { LayoutEngine } from "../../src/ui/layout/layout.js";
import { WINDOW_NAMES } from "../../src/constants.js";
import { KeyEvent } from "../../src/Input/inputParser.js";

// Drives the real editor the way a user does: with keys.
//
//   const ide = vim("foo |bar baz");
//   ide.keys("dw");
//   expect(ide.text()).eq("foo |baz");
//
// "|" marks the cursor: in normal mode it sits on the character after it,
// in insert mode it is the insertion point. Keys use Vim notation: plain
// characters, <Esc> <CR> <BS> <Del> <Tab> <Up> <Down> <Left> <Right>
// <Home> <End> <PageUp> <PageDown> <Space> <lt> (a literal "<"), and
// <C-x> for Ctrl+x.

export const CURSOR = "|";

export type IdeOptions = {
  // the document's file name; the extension picks the language
  path?: string;
  width?: number;
  height?: number;
};

export function vim(text: string, options: IdeOptions = {}) {
  return new Ide(text, options);
}

// shorthand for the most common spec: start text, keys, resulting text
//   expect(after("foo |bar", "x")).eq("foo |ar")
export function after(text: string, keys: string, options: IdeOptions = {}) {
  return vim(text, options).keys(keys).text();
}

export class Ide {
  readonly ctx: EditorContext;
  readonly status: StatusWindow;
  readonly group: CodeEditorGroup;
  readonly primary: UiPanel;
  readonly width: number;
  readonly height: number;

  constructor(text: string, options: IdeOptions = {}) {
    this.width = options.width ?? 40;
    this.height = options.height ?? 10;

    const ctx = new EditorContext();
    ctx.renderer.setOutput(() => {});
    ctx.setLayout(LayoutEngine.CreateBounds(this.width, this.height));
    setupEditor.root(ctx);

    // root
    // ├── primary  (editor group)
    // └── status   (one row at the bottom)
    const primary = new UiPanel().setName(WINDOW_NAMES.PRIMARY_WINDOW);
    primary.view().setDirection("horizontal");
    this.primary = primary;

    this.group = new CodeEditorGroup();
    this.group.setName("tab_editor_group");
    ctx.addWindow(this.group);
    primary.addChildren(this.group);

    setupEditor.windows.status(ctx);
    this.status = ctx.findWindow(StatusWindow)!;

    ctx.rootWindow.addChildren(primary);
    ctx.rootWindow.addChildren(this.status);

    // the command-mode setup is left out on purpose: it binds :q to
    // process.exit, which would kill the test run
    setupEditor.commands.normalMode(ctx);
    setupEditor.commands.visualMode(ctx);

    this.ctx = ctx;

    const { content, line, column } = parseCursor(text);
    const window = this.open(options.path ?? "test.txt", content);
    window.cursor().line = line;
    window.cursor().column = column;
    window.cursor().prefferedColumn = column;
  }

  // opens a document from memory in a new tab and focuses it
  open(path: string, content: string) {
    const window = new CodeEditorWindow(
      new Textdocument(new MemoryFile(path, content)),
    );
    this.ctx.addWindow(window);
    this.group.add(path, window);
    this.group.focusWindow(window);
    this.ctx.focus(window);
    return window;
  }

  // puts a window in the layout left of the editor group, the way index.ts
  // places the file tree, so screen() and show() draw it. It is also
  // registered with the window manager so it can be focused.
  addSidebar(window: UiComponent, width = 20) {
    window.view().setMaxWidth(width);
    this.ctx.addWindow(window);
    this.primary.addChildAt(window, 0);
    return window;
  }

  // opens a file from disk the way the file tree does
  openFile(path: string) {
    const window = this.ctx.openFile(path);
    if (window) this.ctx.focus(window);
    return window;
  }

  keys(sequence: string) {
    const exit = process.exit;
    process.exit = ((code?: number) => {
      throw new Error(`process.exit(${code}) called from a key binding`);
    }) as typeof process.exit;

    try {
      for (const key of parseKeys(sequence)) {
        this.ctx.handleKey(key);
      }
    } finally {
      process.exit = exit;
    }
    return this;
  }

  // the code window that has focus (or had it last, while typing a command)
  window(): CodeEditorWindow {
    const active = this.ctx.getActiveWindow();
    if (active instanceof CodeEditorWindow) {
      return active;
    }

    const previous = this.ctx.windowManager.previousWindow(CodeEditorWindow);
    if (previous instanceof CodeEditorWindow) {
      return previous;
    }
    throw new Error("no code window is open");
  }

  document() {
    return this.window().document;
  }

  lines(): string[] {
    const buffer = this.window().buffer();
    const lines: string[] = [];
    for (let i = 0; i < buffer.count(); i++) {
      lines.push(buffer.at(i) ?? "");
    }
    return lines;
  }

  // the buffer with "|" at the cursor
  text(): string {
    const { line, column } = this.cursor();
    return this.lines()
      .map((content, i) =>
        i === line
          ? content.slice(0, column) + CURSOR + content.slice(column)
          : content,
      )
      .join("\n");
  }

  cursor() {
    const cursor = this.window().cursor();
    return { line: cursor.line, column: cursor.column };
  }

  mode(): EditingModes {
    return this.ctx.modeName;
  }

  // renders a frame from scratch and returns it with its colors. Everything
  // is marked dirty first: the engine caches layout, and a spec may have laid
  // out one window on its own in between (like the file tree specs do)
  private frame(): string {
    const root = this.ctx.rootWindow;
    const invalidate = (view: DisplayComponent) => {
      view.setDirty(true);
      view.children().forEach(invalidate);
    };
    invalidate(root.view());

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(this.width, this.height),
    );
    LayoutEngine.Arrange(root);
    this.ctx.renderer.build(root);
    return this.ctx.renderer.render();
  }

  // renders a frame and returns its rows as plain text
  screen(): string[] {
    return stripAnsi(this.frame()).split("\r\n");
  }

  statusLine(): string {
    return this.screen().at(-1) ?? "";
  }

  // prints the current frame, with its colors, inside a border, so you can
  // look at what a test sees:  vim("|abc").keys("x").show("after x")
  show(label = "screen") {
    const rows = this.frame().split("\r\n");

    const border = "─".repeat(this.width);
    const { line, column } = this.cursor();

    console.log(label);
    console.log(
      [
        `┌${border}┐`,
        ...rows.map((row) => `│${row}\x1b[0m│`),
        `└${border}┘`,
      ].join("\n"),
    );

    console.log(` mode: ${this.mode()}, cursor: ${line}:${column}`);
    return this;
  }

  // the text view inside the focused code window
  textView(): UIScreen {
    return this.window().defaultFocus() as UIScreen;
  }

  viewport() {
    return this.textView().view().viewport();
  }

  // where the text is drawn on screen (valid after screen())
  textArea() {
    return this.textView().view().contentLayout();
  }

  // the rows of the screen that show text, in order (valid after screen())
  textRows(): string[] {
    const screen = this.screen();
    const area = this.textArea();
    return screen.slice(area.y, area.y + area.height);
  }

  // the painted cells of the last frame, for checking styles
  canvas(): Canvas {
    return (this.ctx.renderer as unknown as { _canvas: Canvas })._canvas;
  }

  // code windows currently in the layout and visible (one per split)
  visibleCodeWindows(): CodeEditorWindow[] {
    const found: CodeEditorWindow[] = [];
    const visit = (component: UiComponent) => {
      if (!component.view().visible()) return;
      if (component instanceof CodeEditorWindow) found.push(component);
      for (const child of component.children()) visit(child);
    };
    visit(this.ctx.rootWindow);
    return found;
  }
}

export function parseCursor(text: string) {
  const lines = text.split("\n");
  for (let line = 0; line < lines.length; line++) {
    const column = lines[line].indexOf(CURSOR);
    if (column !== -1) {
      lines[line] =
        lines[line].slice(0, column) + lines[line].slice(column + 1);
      return { content: lines.join("\n"), line, column };
    }
  }
  return { content: text, line: 0, column: 0 };
}

const NAMED: Record<string, string> = {
  esc: "<Esc>",
  cr: "<CR>",
  enter: "<CR>",
  bs: "<BS>",
  del: "<Del>",
  tab: "<Tab>",
  up: "<Up>",
  down: "<Down>",
  left: "<Left>",
  right: "<Right>",
  home: "<Home>",
  end: "<End>",
  pageup: "<PageUp>",
  pagedown: "<PageDown>",
  space: " ",
  lt: "<",
};

export function parseKeys(sequence: string): KeyEvent[] {
  const keys: KeyEvent[] = [];
  let i = 0;

  while (i < sequence.length) {
    const close = sequence[i] === "<" ? sequence.indexOf(">", i) : -1;
    const name = close === -1 ? "" : sequence.slice(i + 1, close);

    const ctrl = name.match(/^C-(.)$/i);
    if (ctrl) {
      keys.push({
        token: ctrl[1].toLowerCase(),
        ctrl: true,
        alt: false,
        shift: false,
      });
      i = close + 1;
      continue;
    }

    const named = NAMED[name.toLowerCase()];
    if (named !== undefined) {
      keys.push({ token: named, ctrl: false, alt: false, shift: false });
      i = close + 1;
      continue;
    }

    const ch = sequence[i];
    keys.push({
      token: ch,
      ctrl: false,
      alt: false,
      shift: ch >= "A" && ch <= "Z",
    });
    i++;
  }

  return keys;
}

export function stripAnsi(text: string) {
  return text.replace(/\x1b\[[0-9;?<>]*[A-Za-z]/g, "");
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
