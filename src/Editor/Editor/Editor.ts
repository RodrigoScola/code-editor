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
import { DiskFile, Textdocument } from "../Documents/TextDocument.js";
import { WindowManager } from "../windows/WindowManager/WindowManager.js";
import { EditorWindow } from "../windows/EditorWindow.js";
import { StatusWindow } from "../windows/StatusEditor.js";
import { TextEditorWindow } from "../windows/TextEditorWindow.js";
import { EditorRoot } from "./EditorRoot.js";

export class EditorContext {
  layout: LayoutBounds = { height: 0, width: 0, x: 0, y: 0 };
  windowManager: WindowManager;
  static instance: EditorContext | null;
  canvas: Canvas = new Canvas();
  renderer: Renderer = new Renderer();
  rootWindow: EditorRoot = new EditorRoot();
  normalMode: NormalMode = new NormalMode();
  visualMode: VisualMode = new VisualMode();
  insertMode: InsertMode = new InsertMode();

  commandMode: CommandMode = new CommandMode();
  private mode: EditorMode = this.normalMode;
  modeName: EditingModes = "normal";

  private renderPending: boolean = false;

  constructor() {
    EditorContext.instance = this;
    this.windowManager = new WindowManager(this.rootWindow);
  }
  findWindow<T extends EditorWindow>(
    type: new (...args: any[]) => T,
  ): T | null {
    return this.windowManager.find(type);
  }

  handleKey(key: KeyEvent) {
    if (!key.token) {
      return;
    }
    this.mode.handleKey(key, this);
  }
  focus(window: EditorWindow) {
    return this.windowManager.focus(window);
  }
  openFile(path: string) {
    try {
      const editor = this.windowManager.find(TextEditorWindow);
      if (!editor) return;
      editor?.openDocument(new Textdocument(new DiskFile(path)));

      editor?.reset();

      return editor;
    } catch (err) {
      return null;
    }
  }
  getActiveWindow(): EditorWindow | null {
    return this.windowManager.activeWindow();
  }

  setMode(m: EditingModes) {
    this.modeName = m;
    if (m === "normal") {
      this.mode = this.normalMode;
    } else if (m === "insert") {
      this.mode = this.insertMode;
    } else if (m === "visual") {
      this.mode = this.visualMode;
    } else if (m === "command") {
      this.mode = this.commandMode;

      const statusWindow = this.windowManager.find(StatusWindow);
      assert(statusWindow, "no status window initialized");
      this.windowManager.focus(statusWindow);
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
    process.stdout.write("\x1b[H" + this.render());
  }
  render() {
    assert(this.rootWindow, "cannot render anything without a root window");

    LayoutEngine.Measure(this.rootWindow, this.rootWindow.contentLayout());
    this.renderer.build(this.rootWindow, this.canvas);
    return this.renderer.render(this.canvas);
  }
  executeCommand() {}
  addWindow(window: EditorWindow) {
    this.windowManager.add(window);
    return this;
  }
}
