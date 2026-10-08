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
import { StatusWindow } from "../windows/StatusEditor.js";
import { EditorRoot } from "./EditorRoot.js";
import { LayoutBounds } from "../../ui/layout/layoutStyle.js";
import { CodeEditorWindow } from "../windows/CodeEditorWindow.js";
import { Configuration, EditorConfig, setConfiguration } from "../../config.js";
import { CodeEditorGroup } from "../windows/Tab/TabWindow.js";
import { FocusManager } from "../../ui/windows/FocusManager.js";
import { UiComponent } from "../../ui/components/UiComponent.js";

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
  private mode: EditorMode = this.normalMode;
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
    this.mode.handleKey(key, this);
  }
  unfocus(window: UiComponent) {
    this.windowManager.deactivate(window);
  }

  focus(window: UiComponent) {
    this.windowManager.activate(window);
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
      this.mode = this.normalMode;
    } else if (m === "insert") {
      this.mode = this.insertMode;
    } else if (m === "visual") {
      this.mode = this.visualMode;
    } else if (m === "command") {
      this.mode = this.commandMode;

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
  executeCommand() {}
  addWindow(window: UiComponent) {
    this.windowManager.add(window);
    return this;
  }

  setLayout(layout: LayoutBounds) {
    this.renderer.setLayout(layout);
    return this;
  }
}
