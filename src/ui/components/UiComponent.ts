import { start } from "repl";
import { buffer } from "stream/consumers";
import { TextBuffer } from "../buffer/Buffer.js";
import { Canvas } from "../canvas.js";
import { DisplayComponent } from "./displayComponent.js";
import { ViewPort } from "../windows/viewport.js";
import { Cursor } from "../../Editor/Cursor.js";
import { EditorContext } from "../../Editor/Editor/Editor.js";
import { assert } from "../../assert.js";
import { LayoutDimensions } from "../layout/LayoutDimensions.js";
import { Focusable } from "../windows/FocusManager.js";

type WindowId = string;

export interface EWindow {
  view(): EditorView;
  id(): string;
  onEvent(event: EditorEvents): void;
  onEnter(ctx: EditorContext): void;
}

export class UiComponent implements EWindow, Focusable {
  private _cursorEnabled: boolean = true;
  // buffer/view are attached in the constructor, once _view exists
  private _cursor: Cursor = new Cursor();
  private _view: EditorView;
  private readonly _id: WindowId = crypto.randomUUID();

  private _focused = false;

  cursorEnabled() {
    return this._cursorEnabled;
  }
  setCursorEnabled(value: boolean) {
    this._cursorEnabled = value;
    return this;
  }

  focus(): void {
    this._focused = true;
  }

  blur(): void {
    this._focused = false;
  }

  isFocused(): boolean {
    return this._focused;
  }

  id(): string {
    return this._id;
  }
  setName(name: string) {
    this.view().setName(name);
    return this;
  }
  name() {
    return this.view().name();
  }

  constructor() {
    this._view = new EditorView(this);

    this._cursor.setBuffer(this.view().content().buffer()).setView(this.view());
  }
  defaultFocus(): UiComponent | null {
    return this;
  }
  view(): EditorView {
    return this._view;
  }

  setText(str?: TextBuffer | string | null | undefined) {
    let bffr = new TextBuffer();

    if (typeof str === "string") {
      bffr = new TextBuffer(str);
    } else if (str instanceof TextBuffer) {
      bffr = str;
    } else if (str) {
      throw new Error(
        `tried to pass something other than  text buffer or string `,
      );
    }

    this.view().content().setBuffer(bffr);
    return this;
  }

  onPrePaint() {
    const cl = this._view.contentLayout();
    this._view.viewport().ensureVisible(cl.width, cl.height);
    this.cursor().ensureVisible(this.view().viewport());
  }
  onPostPaint(canvas: Canvas) {
    if (this.cursorEnabled()) {
      this._cursor.paint(canvas);
    }
  }

  paint(canvas: Canvas): void {
    // the background is already filled by the renderer with styles blended
    // from the parent; refilling here with the raw styles would drop inherited
    // colors (e.g. an unset background would become the terminal default)
    if (this.cursorEnabled()) {
      this.cursor().paintSelection(canvas);
    }
  }

  onEvent(event: EditorEvents): void {
    // todo: when adding config, this is needing a change
    if (event.name !== "editorModeChange") {
      return;
    }
  }

  cursor(): Cursor {
    return this._cursor;
  }
  buffer() {
    return this.view().content().buffer();
  }

  onEnter(ctx: EditorContext) {}

  moveCursorDown() {
    return this.cursor().moveDown();
  }
  moveCursorUp() {
    return this.cursor().moveUp();
  }
  moveCursorLeft() {
    return this.cursor().moveLeft();
  }
  moveCursorRight() {
    return this.cursor().moveRight();
  }
  startSelection() {
    return this.cursor().startSelection();
  }
  endSelection() {
    return this.cursor().clearSelection();
  }
}

export class EditorView extends DisplayComponent {
  private editor: UiComponent;

  constructor(editor: UiComponent) {
    super();

    this.editor = editor;

    this.setPaintHook(editor.paint.bind(editor));
    this.setPrePaintHook(editor.onPrePaint.bind(editor));
    this.setPostPaintHook(editor.onPostPaint.bind(editor));
  }
}
