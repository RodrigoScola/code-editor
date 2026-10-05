import { UiComponent } from '../components/UiComponent.js';
import { LayoutBounds } from "../layout/layoutStyle.js";

export interface Focusable {
  focus(): void;
  blur(): void;
  isFocused(): boolean;
}

export class FocusManager {
  private _active: UiComponent | null = null;
  active() {
    return this._active;
  }
  focus(focusable: UiComponent | null) {
    if (!focusable) {
      return;
    }
    if (this._active === focusable) {
      return;
    }
    this._active = focusable;
    this.active()?.focus();
  }
  unfocus(focusable: UiComponent | null) {
    if (!focusable) {
      return;
    }
    if (this._active === focusable) {
      this._active = null;
    }
    focusable.blur();
  }
  clear() {
    this._active = null;
  }
  hasFocus() {}
}
