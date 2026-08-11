import { CommandMode, InsertMode, NormalMode } from "../Commands/Commands.js";
import { assert } from "../assert.js";
import { TextBuffer } from "../ui/buffer/Buffer.js";
import { Canvas } from "../ui/canvas.js";
import { DisplayComponent } from "../ui/components.js";
import { LayoutEngine } from "../ui/layout.js";
import { Renderer } from "../ui/renderer.js";
import { DiskFile, Textdocument } from "./Documents/TextDocument.js";
import { EditorWindow } from "./windows/EditorWindow.js";
import { GitEditorWindow } from "./windows/GitEditorWindow.js";
import { StatusWindow } from "./windows/StatusEditor.js";
import { TextEditorWindow } from "./windows/TextEditorWindow.js";

export class EditorContext {
  static instance: EditorContext | null;
  canvas: Canvas = new Canvas();
  renderer: Renderer = new Renderer();
  activeWindow: EditorWindow | null = null;
  rootWindow: Component = new DisplayComponent();
  gitEditorWindow: GitEditorWindow | null = null;
  textEditorWindow: TextEditorWindow | null = null;
  statusWindow: StatusWindow | null = null;
  normalMode: NormalMode = new NormalMode();
  insertMode: InsertMode = new InsertMode();
  commandMode: CommandMode = new CommandMode();
  mode: EditorMode = this.normalMode;
  modeName: EditingModes = "normal";

  constructor() {
    EditorContext.instance = this;
  }

  handleKey(key: KeyEvent) {
    if (!key.token) {
      return;
    }
    this.mode.handleKey(key, this);
  }
  focus(window: EditorWindow) {
    this.activeWindow = window;
  }
  openNewTextWindow(path: string) {
    if (!this.textEditorWindow) {
      return;
    }
    this.textEditorWindow.document = new Textdocument(new DiskFile(path));
    this.textEditorWindow.buffer = new TextBuffer(
      this.textEditorWindow.document.read(),
    );
    this.textEditorWindow.reset();

    return this.textEditorWindow;
  }
  getActiveTextEditor(): TextEditorWindow {
    if (this.activeWindow instanceof TextEditorWindow) {
      return this.activeWindow;
    }

    assert(this.textEditorWindow, "missing active text editor");
    return this.textEditorWindow;
  }
  focusTextWindow() {
    assert(this.textEditorWindow, "missing active text editor");
    this.activeWindow = this.textEditorWindow;
  }
  setMode(m: EditingModes) {
    this.modeName = m;
    if (m === "normal") {
      this.mode = this.normalMode;
    } else if (m === "insert") {
      this.mode = this.insertMode;
      assert(this.textEditorWindow, "missing active text editor");
      // this.activeWindow = this.textEditorWindow;
    } else if (m === "command") {
      this.mode = this.commandMode;
      assert(this.statusWindow, "missing status window");
      this.activeWindow = this.statusWindow;
    } else {
      throw new Error(`mode: ${m} has not been made yet`);
    }
    this.activeWindow?.onEvent({ name: "editorModeChange", mode: m });
  }
  repaint() {}
  render() {
    assert(this.rootWindow, "cannot render anything without a root window");

    LayoutEngine.Measure(this.rootWindow, this.rootWindow.contentLayout());
    this.renderer.build(this.rootWindow, this.canvas);
    return this.renderer.render(this.canvas);
  }
}
