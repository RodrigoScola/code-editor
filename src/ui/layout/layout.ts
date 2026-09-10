import { DisplayComponent, parseSize } from "../components/components.js";

export class LayoutEngine {
  static CreateBounds(
    width: number = 0,
    height: number = width,
    x: number = 0,
    y: number = 0,
  ): LayoutBounds {
    return {
      x: x,
      y: y,
      width: width,
      height: height,
    };
  }

  static ArrangeAbsolute(child: DisplayComponent, bounds: LayoutBounds) {
    const width =
      parseSize(child.width(), bounds.width) ?? child.measuredSize().width;

    const height =
      parseSize(child.height(), bounds.height) ?? child.measuredSize().height;

    const x = parseSize(child.startX(), bounds.width) ?? 0;

    const y = parseSize(child.startY(), bounds.height) ?? 0;

    child.arrange({
      x: bounds.x + x,
      y: bounds.y + y,
      width,
      height,
    });
  }

  static ArrangeVertical(
    normalChildren: DisplayComponent[],
    bounds: LayoutBounds,
  ) {
    let remainingHeight = bounds.height;

    // First consume children with explicit heights.
    for (const child of normalChildren) {
      if (child.height() === "auto") {
        continue;
      }

      const margin = child.margin();

      const height = parseSize(child.height(), bounds.height)!;

      remainingHeight -= height;
      remainingHeight -= margin.top + margin.bottom;
    }

    remainingHeight = Math.max(0, remainingHeight);

    const autoChildren = normalChildren.filter(
      (child) => child.height() === "auto",
    );

    // Allocate the remaining space to auto children while
    // respecting maxHeight.
    const autoHeights = new Map<DisplayComponent, number>();

    let unresolved = [...autoChildren];
    let available = remainingHeight;

    while (unresolved.length > 0) {
      const share = available / unresolved.length;

      const capped: DisplayComponent[] = [];
      const uncapped: DisplayComponent[] = [];

      for (const child of unresolved) {
        const maxHeight = child.maxHeight();

        if (maxHeight !== null && maxHeight < share) {
          autoHeights.set(child, maxHeight);
          available -= maxHeight;

          const margin = child.margin();
          available -= margin.top + margin.bottom;

          capped.push(child);
        } else {
          uncapped.push(child);
        }
      }

      if (capped.length === 0) {
        for (const child of uncapped) {
          autoHeights.set(child, Math.max(0, share));
        }

        break;
      }

      unresolved = uncapped;
      available = Math.max(0, available);
    }

    let y = bounds.y;

    for (const child of normalChildren) {
      const margin = child.margin();

      y += margin.top;

      const width =
        parseSize(child.width(), bounds.width) ??
        Math.max(0, bounds.width - margin.left - margin.right);

      const height =
        child.height() === "auto"
          ? (autoHeights.get(child) ?? 0)
          : parseSize(child.height(), bounds.height)!;

      child.arrange({
        x: bounds.x + margin.left,
        y,
        width,
        height,
      });

      y += height + margin.bottom;
    }
  }

  static ArrangeHorizontal(
    normalChildren: DisplayComponent[],
    bounds: LayoutBounds,
  ) {
    let remainingWidth = bounds.width;

    // First consume children with explicit widths.
    for (const child of normalChildren) {
      if (child.width() === "auto") {
        continue;
      }

      const margin = child.margin();

      const width = parseSize(child.width(), bounds.width)!;

      remainingWidth -= width;
      remainingWidth -= margin.left + margin.right;
    }

    remainingWidth = Math.max(0, remainingWidth);

    const autoChildren = normalChildren.filter(
      (child) => child.width() === "auto",
    );

    // Remove auto children's margins before distributing
    // the remaining space between their actual widths.
    for (const child of autoChildren) {
      const margin = child.margin();

      remainingWidth -= margin.left + margin.right;
    }

    remainingWidth = Math.max(0, remainingWidth);

    const autoWidths = new Map<DisplayComponent, number>();

    let unresolved = [...autoChildren];
    let available = remainingWidth;

    while (unresolved.length > 0) {
      const share = available / unresolved.length;

      const capped: DisplayComponent[] = [];
      const uncapped: DisplayComponent[] = [];

      for (const child of unresolved) {
        const maxWidth = child.maxWidth();

        if (maxWidth !== null && maxWidth < share) {
          autoWidths.set(child, maxWidth);

          available -= maxWidth;

          capped.push(child);
        } else {
          uncapped.push(child);
        }
      }

      if (capped.length === 0) {
        for (const child of uncapped) {
          autoWidths.set(child, Math.max(0, share));
        }

        break;
      }

      unresolved = uncapped;
      available = Math.max(0, available);
    }

    let x = bounds.x;

    for (const child of normalChildren) {
      const margin = child.margin();

      x += margin.left;

      const width =
        child.width() === "auto"
          ? (autoWidths.get(child) ?? 0)
          : parseSize(child.width(), bounds.width)!;

      const height =
        parseSize(child.height(), bounds.height) ??
        Math.max(0, bounds.height - margin.top - margin.bottom);

      child.arrange({
        x,
        y: bounds.y + margin.top,
        width,
        height,
      });

      x += width + margin.right;
    }
  }
  static CreateConstraints(
    width: number,
    height: number = width,
  ): MeasureConstraints {
    return {
      maxHeight: height,
      maxWidth: width,
      minHeight: height,
      minWidth: width,
    };
  }
  private static UNCONSTRAINED_LAYOUT = {
    maxHeight: Infinity,
    minHeight: 0,
    maxWidth: Infinity,
    minWidth: 0,
  };

  static Measure(component: DisplayComponent, constraints: MeasureConstraints) {
    component.measure(constraints);

    return this;
  }

  static Arrange(root: DisplayComponent, bounds?: LayoutBounds) {
    root.arrange(bounds || root.contentLayout());
    return this;
  }
  static Layout(
    component: DisplayComponent,
    constraints: MeasureConstraints,
    bounds: LayoutBounds,
  ) {
    const measured = this.Measure(component, constraints);

    this.Arrange(component, bounds);
    return measured;
  }

  static Unconstrained(): MeasureConstraints {
    return this.UNCONSTRAINED_LAYOUT;
  }
  static ClampSize(
    size: MeasuredSize,
    constraints: MeasureConstraints,
  ): MeasuredSize {
    return {
      width: Math.max(
        constraints.minWidth,
        Math.min(size.width, constraints.maxWidth),
      ),
      height: Math.max(
        constraints.minHeight,
        Math.min(size.height, constraints.maxHeight),
      ),
    };
  }
}
