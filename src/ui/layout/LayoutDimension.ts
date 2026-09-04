import { DisplayComponent } from "../components.js";

export class LayoutDimensions {
  public static isWidthFlexible(
    child: DisplayComponent,
    available?: LayoutBounds,
  ) {
    let result = false;

    available ??= child.parent()?.contentLayout();
    let hasMeasured = false;
    let hasReq = false;

    if (available) {
      hasMeasured = Number.isFinite(child.measure(available).width);
      hasReq = Boolean(
        Number.isFinite(this.parseSize(child.width(), available.width)),
      );
    }

    if (!hasReq && !hasMeasured && !Number.isFinite(child.maxWidth())) {
      result = true;
    }

    return result;
  }
  public static isHeightFlexible(
    child: DisplayComponent,
    available?: LayoutBounds,
  ) {
    let result = false;

    available ??= child.parent()?.contentLayout();

    let hasMeasured = false;
    let hasReq = false;

    if (available) {
      hasMeasured = Number.isFinite(child.measure(available).height);
      hasReq = Boolean(
        Number.isFinite(this.parseSize(child.height(), available.height)),
      );
    }

    if (!hasReq && !hasMeasured && !Number.isFinite(child.maxHeight())) {
      result = true;
    }

    return result;
  }
  static requestWidth(child: DisplayComponent, parent: LayoutBounds) {
    let result: number | undefined = undefined;

    const margin = child.margin();
    const measured = child.measure(parent);
    const requestedWidth = this.parseSize(child.width(), parent.width);

    if (requestedWidth !== null) {
      result = requestedWidth;
    } else if (Number.isFinite(measured.width)) {
      result = measured.width!;
    } else {
      result = parent.width - margin.left - margin.right;
    }

    if (child.maxWidth() !== null) {
      result = Math.min(result, child.maxWidth()!);
    }
    return result;
  }
  static requestHeight(child: DisplayComponent, parent: LayoutBounds) {
    const measured = child.measure(parent);

    const parsedHeight = this.parseSize(child.height(), parent.height);
    let out: number | undefined = undefined;

    if (parsedHeight !== null) {
      out = parsedHeight;
    } else if (Number.isFinite(measured.height)) {
      out = measured.height!;
    }
    if (child.maxHeight() !== null) {
      out = Math.min(child.maxHeight()!, out || Infinity);
    }
    return out;
  }

  static parseSize(size: Size, available: number) {
    if (size === "auto") {
      return null;
    }
    if (typeof size === "number") {
      return size;
    }
    if (size.endsWith("%")) {
      const percentage = Number.parseFloat(size);
      if (!Number.isFinite(percentage)) {
        return null;
      }
      const out = Math.floor((available * percentage) / 100);
      return out;
    }
    return null;
  }
}
