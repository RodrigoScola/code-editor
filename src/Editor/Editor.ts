import { CommandMode, InsertMode, NormalMode } from "../Commands/Commands.js";
import { assert } from "../assert.js";
import { TextBuffer } from "../ui/buffer/Buffer.js";
import { Canvas } from "../ui/canvas.js";
import { DisplayComponent } from "../ui/components.js";
import { LayoutEngine } from "../ui/layout/layout.js";
import { Renderer } from "../ui/renderer.js";
import { DiskFile, Textdocument } from "./Documents/TextDocument.js";
import { EditorWindow } from "./windows/EditorWindow.js";
import { FileTreeWindow } from "./windows/FileTreeWindow.js";
import { GitCommitWindow, GitEditorWindow } from "./windows/GitEditorWindow.js";
import { StatusWindow } from "./windows/StatusEditor.js";
import { TextEditorWindow } from "./windows/TextEditorWindow.js";

export class EditorContext {
  layout: LayoutBounds = { height: 0, width: 0, x: 0, y: 0 };
  static instance: EditorContext | null;
  canvas: Canvas = new Canvas();
  renderer: Renderer = new Renderer();
  activeWindow: EditorWindow | null = null;
  rootWindow: DisplayComponent = new DisplayComponent();
  gitEditor: GitEditorWindow | null = null;
  gitCommit: GitCommitWindow | null = null;
  textEditor: TextEditorWindow | null = null;
  fileTree: FileTreeWindow | null = null;
  statusWindow: StatusWindow | null = null;
  normalMode: NormalMode = new NormalMode();
  insertMode: InsertMode = new InsertMode();

  commandMode: CommandMode = new CommandMode();
  mode: EditorMode = this.normalMode;
  modeName: EditingModes = "normal";

  private renderPending: boolean = false;

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
  openFile(path: string) {
    try {
      this.textEditor?.openDocument(new Textdocument(new DiskFile(path)));

      this.textEditor?.reset();

      return this.textEditor;
    } catch (err) {
      console.error(`could not open ${path}`, err);
      return null;
    }
  }
  getActiveTextEditor(): TextEditorWindow {
    if (this.activeWindow instanceof TextEditorWindow) {
      return this.activeWindow;
    }

    assert(this.textEditor, "missing active text editor");
    return this.textEditor;
  }
  focusTextWindow() {
    assert(this.textEditor, "missing active text editor");

    this.activeWindow = this.textEditor;
  }
  setMode(m: EditingModes) {
    this.modeName = m;
    if (m === "normal") {
      this.mode = this.normalMode;
    } else if (m === "insert") {
      this.mode = this.insertMode;
      assert(this.textEditor, "missing active text editor");
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
    process.stdout.write("\x1b[H" + this.render());
  }
  render() {
    assert(this.rootWindow, "cannot render anything without a root window");

    LayoutEngine.Measure(this.rootWindow, this.rootWindow.contentLayout());
    this.renderer.build(this.rootWindow, this.canvas);
    return this.renderer.render(this.canvas);
  }
  executeCommand() {}
}
