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
import { DisplayLike } from "../layout/layout.js";

type WindowId = number;

export interface EWindow {
  view(): EditorView;
  id(): number;
  onEvent(event: EditorEvents): void;
  onEnter(ctx: EditorContext): void;
}

export class UiComponent implements EWindow, Focusable, DisplayLike {
  private _view: EditorView = new EditorView(this);
  private readonly _id: WindowId = this._view.getId();

  private _parent: UiComponent | null = null;

  private childs: UiComponent[] = [];

  private _focused = false;

  focus(): void {
    this._focused = true;
    this.onFocus();
  }

  blur(): void {
    this._focused = false;
    this.onBlur();
  }

  isFocused(): boolean {
    return this._focused;
  }

  id(): number {
    return this._id;
  }
  setName(name: string) {
    this.view().setName(name);
    return this;
  }
  name() {
    return this.view().name();
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
  onPostPaint(canvas: Canvas) {}

  onPrePaint(canvas: Canvas) {
    const cl = this._view.contentLayout();
    this._view.viewport().ensureVisible(cl.width, cl.height);
  }

  onEvent(event: EditorEvents): void {
    // todo: when adding config, this is needing a change
    if (event.name !== "editorModeChange") {
      return;
    }
  }

  buffer() {
    return this.view().content().buffer();
  }

  onEnter(ctx: EditorContext) {}

  children(): UiComponent[] {
    return this.childs;
  }

  addChildren(children: UiComponent[]): this;
  addChildren(child: UiComponent): this;
  addChildren(children: UiComponent | UiComponent[]): this {
    for (const child of Array.isArray(children) ? children : [children]) {
      this.addChildAt(child, this.childs.length);
    }

    return this;
  }

  findChildrenById(id: number): UiComponent | null {
    if (id === this.id()) {
      return this;
    }
    for (const child of this.children()) {
      const found = child.findChildrenById(id);

      if (found) {
        return found;
      }
    }
    return null;
  }
  findChildrenByName(nm: string): UiComponent | null {
    if (this.name() === nm) {
      return this;
    }

    for (const child of this.children()) {
      const found = child.findChildrenByName(nm);

      if (found) {
        return found;
      }
    }

    return null;
  }

  // layout and painting walk view().children(), so every change to this tree
  // has to be mirrored there or the two drift apart
  addChildAt(child: UiComponent, index: number): this {
    assert(child !== this, "cannot add a component to itself");

    // detach from wherever it lives now, otherwise it ends up in two parents
    child.parent()?.removeChild(child);
    child.view().parent()?.removeChild(child.view());

    index = Math.max(0, Math.min(index, this.childs.length));

    // the view can hold raw DisplayComponents too, so place the child's view
    // right before the view of the sibling it is inserted before
    const next = this.childs[index];
    const viewIndex = next ? this.view().children().indexOf(next.view()) : -1;

    if (viewIndex === -1) {
      this.view().addChildren(child.view());
    } else {
      this.view().addChildAt(child.view(), viewIndex);
    }

    this.childs.splice(index, 0, child);
    child._parent = this;

    return this;
  }

  clearChildren() {
    this.childs = [];
    return this;
  }
  removeChild(child: UiComponent): this {
    this.childs = this.childs.filter((current) => current !== child);

    if (child.view().parent() === this.view()) {
      this.view().removeChild(child.view());
    }
    child._parent = null;

    return this;
  }

  parent(): UiComponent | null {
    return this._parent;
  }
  paint(canvas: Canvas) {}
  onFocus() {}
  onBlur() {}
}

export class UiPanel extends UiComponent {}

export class UIScreen extends UiComponent {
  private _cursorEnabled: boolean = true;
  // buffer/view are attached in the constructor, once _view exists
  private _cursor: Cursor = new Cursor();

  constructor() {
    super();
    this._cursor.setBuffer(this.view().content()).setView(this.view());
  }

  // setText swaps the view's buffer, so the cursor has to follow it
  setText(str?: TextBuffer | string | null | undefined) {
    super.setText(str);
    this._cursor.setBuffer(this.view().content());
    return this;
  }

  cursorEnabled() {
    return this._cursorEnabled;
  }
  setCursorEnabled(value: boolean) {
    this._cursorEnabled = value;
    return this;
  }

  cursor(): Cursor {
    return this._cursor;
  }

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

  paint(canvas: Canvas): void {
    // the background is already filled by the renderer with styles blended
    // from the parent; refilling here with the raw styles would drop inherited
    // colors (e.g. an unset background would become the terminal default)
    if (this.cursorEnabled()) {
      this.cursor().paintSelection(canvas);
    }
  }

  onPostPaint(canvas: Canvas) {
    if (this.cursorEnabled()) {
      this._cursor.paint(canvas);
    }
  }
  onPrePaint(): void {
    this.cursor().ensureVisible(this.view().viewport());
  }
  onEnter(ctx: EditorContext): void {
    // todo: need to add more edge cases, very buggy
    this.buffer().newLineAt(this.cursor().line + 1);
    this.moveCursorDown();
  }
  removeLine(at: number) {
    this.buffer().removeLine(at);
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
