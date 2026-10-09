import {
  CommandMode,
  InsertMode,
  NormalMode,
  VisualMode,
} from "../../Commands/Commands.js";
import { assert } from "../../assert.js";
import { Canvas } from "../../ui/canvas.js";
import { LayoutEngine } from "../../ui/layout/layout.js";
import { Renderer } from "../../ui/renderer.js";
import {
  DiskFile,
  MemoryFile,
  Textdocument,
} from "../Documents/TextDocument.js";
import { WindowManager } from "../windows/WindowManager/WindowManager.js";
import { StatusWindow } from "../windows/StatusEditor.js";
import { EditorRoot } from "./EditorRoot.js";
import { LayoutBounds } from "../../ui/layout/layoutStyle.js";
import { CodeEditorWindow } from "../windows/CodeEditorWindow.js";
import { Configuration, EditorConfig, setConfiguration } from "../../config.js";
import { CodeEditorGroup } from "../windows/Tab/TabWindow.js";
import { FocusManager } from "../../ui/windows/FocusManager.js";
import { UiComponent, UIScreen } from "../../ui/components/UiComponent.js";
import { DisplayComponent } from "../../ui/components/displayComponent.js";
import { stripAnsi } from "../../ui/renderer.js";
import { CommandRegistry } from "../../Commands/CommandRegistry.js";
import { parseKeys } from "../../Input/keyNotation.js";
import { WINDOW_NAMES } from "../../constants.js";
import { EditorSelection } from "../Selection.js";
import { CURSOR, renderSelections, TextSelection } from "../textMarkers.js";
import fs from "fs";

export class EditorContext {
  focusManager: FocusManager = new FocusManager();
  static instance: EditorContext | null;
  renderer: Renderer = new Renderer(new Canvas());
  rootWindow: EditorRoot = new EditorRoot();
  normalMode: NormalMode = new NormalMode();
  visualMode: VisualMode = new VisualMode();
  insertMode: InsertMode = new InsertMode();

  windowManager: WindowManager = new WindowManager(
    this.rootWindow,
    this.focusManager,
  );

  commandMode: CommandMode = new CommandMode();
  commands: CommandRegistry = new CommandRegistry();
  private currentMode: EditorMode = this.normalMode;
  modeName: EditingModes = "normal";

  private renderPending: boolean = false;
  static Configuration(): EditorConfig {
    return Configuration();
  }
  static SetConfiguration(config: EditorConfig) {
    setConfiguration(config);
  }

  constructor() {
    EditorContext.instance = this;
  }
  findWindow<T extends UiComponent>(type: new (...args: any[]) => T): T | null {
    return this.windowManager.find(type);
  }

  handleKey(key: KeyEvent) {
    if (!key.token) {
      return;
    }
    this.currentMode.handleKey(key, this);
  }
  unfocus(window: UiComponent) {
    this.windowManager.deactivate(window);
  }
  focusPrevious() {
    const window = this.windowManager.previousWindow();
    this.focus(window!);
  }

  focus(window: UiComponent) {
    this.windowManager.activate(window);
  }

  fileExists(path: string): Boolean {
    return fs.existsSync(path)
  }
  newDirectory(path: string) {
    fs.mkdirSync(path, { recursive: true });
  }
  newFile(path: string) {
    fs.writeFileSync(path, "");
  }
  renameFile(path: string, newPath:string) {
    return fs.renameSync(path, newPath)
  }

  removeDirectory(path: string) {
    try {
      fs.rmdirSync(path);
    } catch (err) {
      return;
    }
  }

  removeFile(path: string) {
    try {
      fs.rmSync(path);
    } catch (err) {}
  }

  openFile(path: string) {
    try {
      const hasActive = this.windowManager.activeWindow();
      if (hasActive) this.windowManager.deactivate(hasActive);

      const editorGroup = this.windowManager.find(CodeEditorGroup);

      if (editorGroup?.findByPath(path)) {
        const window = editorGroup.findByPath(path)!;
        editorGroup.focusWindow(window);
        return window;
      } else {
        const window = new CodeEditorWindow(
          new Textdocument(new DiskFile(path)),
        );
        window.openDocument(window.document);
        this.windowManager.add(window);

        editorGroup?.add(path, window);
        editorGroup?.focusWindow(window);
        return window;
      }
    } catch (err) {
      return null;
    }
  }
  getActiveWindow(): UiComponent | null {
    return this.windowManager.activeWindow();
  }
  getFocusedComponent() {
    return this.focusManager.active();
  }

  setMode(m: EditingModes) {
    this.modeName = m;
    if (m === "normal") {
      this.currentMode = this.normalMode;
    } else if (m === "insert") {
      this.currentMode = this.insertMode;
    } else if (m === "visual") {
      this.currentMode = this.visualMode;
    } else if (m === "command") {
      this.currentMode = this.commandMode;

      const statusWindow = this.windowManager.find(StatusWindow);
      assert(statusWindow, "no status window initialized");
      this.windowManager.activate(statusWindow);
    } else {
      throw new Error(`mode: ${m} has not been made yet`);
    }
    this.windowManager
      .activeWindow()
      ?.onEvent({ name: "editorModeChange", mode: m });
  }
  requestRepaint() {
    if (this.renderPending) {
      return;
    }
    this.renderPending = true;
    setImmediate(() => {
      this.renderPending = false;
      this.repaint();
    });
  }

  private repaint() {
    this.render();
  }
  render() {
    assert(this.rootWindow, "cannot render anything without a root window");

    //memory("before measure");
    LayoutEngine.Measure(this.rootWindow, this.rootWindow.layoutConstraints);
    //memory("after measure");

    //memory("before arrange");
    LayoutEngine.Arrange(this.rootWindow);
    //memory("after arrange");

    //memory("before building");
    this.renderer.build(this.rootWindow);
    //memory("after building");
    //memory("before render");

    const render = this.renderer.render();
    //memory("after render");
    return render;
  }
  addWindow(window: UiComponent) {
    this.windowManager.add(window);
    return this;
  }

  setLayout(layout: LayoutBounds) {
    this.renderer.setLayout(layout);
    return this;
  }
  findComponentById(id: number) {
    return this.rootWindow.findChildrenById(id);
  }

  // ---------------------------------------------------------------------
  // Driving the editor from code: the tests use these, and they work the
  // same in the real editor (macros, mappings, scripts).
  //
  //   ctx.keys("dw");                       keys, in Vim notation
  //   ctx.executeCommand("textEditor.moveDown");
  //   ctx.text();                           "foo |baz", "|" is the cursor
  //   ctx.show();                           prints the screen
  // ---------------------------------------------------------------------

  // presses keys written in Vim notation: "dw", "iX<Esc>", "<C-w>v"
  // (see src/Input/keyNotation.ts)
  keys(sequence: string) {
    for (const key of parseKeys(sequence)) {
      this.handleKey(key);
    }
    return this;
  }

  // runs a command from ctx.commands by its id
  executeCommand(id: string, args?: unknown) {
    if (!this.commands.execute(id, this, args)) {
      throw new Error(`no command with the id ${id}`);
    }
    return this;
  }

  // types text at every cursor, in any mode
  type(text: string) {
    return this.executeCommand("textEditor.type", { text });
  }

  // reads a setting, or changes it when given a value:
  //   ctx.setting("tab_width") -> 4
  //   ctx.setting("tab_width", 2)
  setting(key: string): unknown;
  setting(key: string, value: unknown): this;
  setting(key: string, value?: unknown) {
    const config = Configuration() as Record<string, unknown>;
    if (arguments.length === 1) {
      return config[key];
    }
    setConfiguration({ ...config, [key]: value } as EditorConfig);
    return this;
  }

  // the code window that has focus, or had it last (while typing a command)
  window(): CodeEditorWindow {
    const active = this.getActiveWindow();
    if (active instanceof CodeEditorWindow) {
      return active;
    }

    const previous = this.windowManager.previousWindow(CodeEditorWindow);
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

  // the document with "|" at the cursor: "foo |bar"
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
    return this.modeName;
  }

  // the cursor and selection, the first one is the primary one. There is
  // one cursor for now, so this is always one selection
  selections(): TextSelection[] {
    const cursor = this.window().cursor();
    const active = { line: cursor.line, column: cursor.column };

    const selection = cursor.selection;
    if (!selection) {
      return [{ anchor: active, active }];
    }

    const anchor = selection.anchor();
    const head = selection.head();
    return [
      {
        anchor: { line: anchor.y, column: anchor.x },
        active: { line: head.y, column: head.x },
      },
    ];
  }

  setSelections(selections: TextSelection[]) {
    if (selections.length > 1) {
      throw new Error("multiple cursors aren't supported yet");
    }

    const cursor = this.window().cursor();
    const [selection] = selections;
    if (!selection) {
      return this;
    }

    const { anchor, active } = selection;
    cursor.line = active.line;
    cursor.column = active.column;
    cursor.prefferedColumn = active.column;

    if (anchor.line === active.line && anchor.column === active.column) {
      cursor.clearSelection();
    } else {
      cursor.selection = new EditorSelection(
        { x: anchor.column, y: anchor.line },
        { x: active.column, y: active.line },
      );
    }
    return this;
  }

  // the document with its selections marked: "«foo» bar"
  // (see src/Editor/textMarkers.ts)
  state() {
    return renderSelections(this.lines().join("\n"), this.selections());
  }

  // the tabs of open documents
  editorGroup(): CodeEditorGroup {
    const group = this.findWindow(CodeEditorGroup);
    assert(group, "no editor group is set up");
    return group;
  }

  // opens a document that only lives in memory, in a new tab, and focuses it
  openMemoryFile(path: string, content: string) {
    const group = this.editorGroup();

    const window = new CodeEditorWindow(
      new Textdocument(new MemoryFile(path, content)),
    );
    this.addWindow(window);
    group.add(path, window);
    group.focusWindow(window);
    this.focus(window);
    return window;
  }

  // opens a file from disk and focuses it, the way the file tree does
  openAndFocus(path: string) {
    const window = this.openFile(path);
    if (window) this.focus(window);
    return window;
  }

  // puts a window in the layout left of the editor group, the way index.ts
  // places the file tree, and registers it so it can be focused
  addSidebar(window: UiComponent, width = 20) {
    const primary = this.rootWindow.findChildrenByName(
      WINDOW_NAMES.PRIMARY_WINDOW,
    );
    assert(primary, "no primary window to add the sidebar to");

    window.view().setMaxWidth(width);
    this.addWindow(window);
    primary.addChildAt(window, 0);
    return window;
  }

  // renders a frame from scratch and returns it with its colors. Everything
  // is marked dirty first: the engine caches layout, and a window may have
  // been laid out on its own in between
  private renderFrame(): string {
    const root = this.rootWindow;
    const invalidate = (view: DisplayComponent) => {
      view.setDirty(true);
      view.children().forEach(invalidate);
    };
    invalidate(root.view());

    const { width, height } = this.renderer.layout();
    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(width, height));
    LayoutEngine.Arrange(root);
    this.renderer.build(root);
    return this.renderer.render();
  }

  // renders a frame and returns its rows as plain text
  screen(): string[] {
    return stripAnsi(this.renderFrame()).split("\r\n");
  }

  statusLine(): string {
    return this.screen().at(-1) ?? "";
  }

  // prints the current frame with its colors inside a border, and the text
  // with its cursor and selections:  ctx.keys("x").show("after x")
  show(label = "screen") {
    const rows = this.renderFrame().split("\r\n");

    const border = "─".repeat(this.renderer.layout().width);
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
    console.log(`state (${label}):\n${this.state()}`);
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

  // the rows of the screen that show text, in order
  textRows(): string[] {
    const screen = this.screen();
    const area = this.textArea();
    return screen.slice(area.y, area.y + area.height);
  }

  // the painted cells of the last frame, for checking styles
  canvas(): Canvas {
    return this.renderer.canvas();
  }

  // code windows in the layout and visible (one per split)
  visibleCodeWindows(): CodeEditorWindow[] {
    const found: CodeEditorWindow[] = [];
    const visit = (component: UiComponent) => {
      if (!component.view().visible()) return;
      if (component instanceof CodeEditorWindow) found.push(component);
      for (const child of component.children()) visit(child);
    };
    visit(this.rootWindow);
    return found;
  }
}
