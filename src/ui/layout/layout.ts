import { compose } from "stream";
import { DisplayComponent, parseSize } from "../components/displayComponent.js";
import { LayoutDimensions } from "./LayoutDimensions.js";
import { LayoutBounds } from "./layoutStyle.js";

export interface DisplayLike {
  view(): DisplayComponent;
}

type RowItem = {
  child: DisplayLike;
  width: number;
  outerWidth: number;

  margin: Insets;
};
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

  static ArrangeAbsolute(child: DisplayLike, bounds: LayoutBounds) {
    const width =
      LayoutDimensions.requestedOuterWidth(child.view(), bounds.width) ??
      child.view().measuredSize().width;

    const height =
      LayoutDimensions.requestedOuterHeight(child.view(), bounds.height) ??
      child.view().measuredSize().height;

    const margin = child.view().margin();
    const x =
      (parseSize(child.view().startX(), bounds.width) ?? 0) + margin.left;

    const y =
      (parseSize(child.view().startY(), bounds.height) ?? 0) + margin.top;

    child.view().arrange({
      x: bounds.x + x,
      y: bounds.y + y,
      width,
      height,
    });
  }

  static ArrangeVertical(displayLike: DisplayLike, bounds: LayoutBounds) {
    const component = displayLike.view();
    let remainingHeight = bounds.height;

    const normalChildren = component.view().normalChildren();

    // First consume children with explicit heights.
    for (const child of normalChildren) {
      if (child.height() === "auto") {
        continue;
      }

      const margin = child.margin();

      const height = LayoutDimensions.requestedOuterHeight(
        child,
        bounds.height,
      )!;

      remainingHeight -= height;
      remainingHeight -= margin.top + margin.bottom;
    }

    remainingHeight = Math.max(0, remainingHeight);

    const autoChildren = normalChildren.filter(
      (child) => child.height() === "auto",
    );

    // Allocate the remaining space to auto children while
    // respecting maxHeight.
    const autoHeights = new Map<DisplayLike, number>();

    let unresolved: DisplayLike[] = [...autoChildren];
    let available = remainingHeight;

    while (unresolved.length > 0) {
      const share = available / unresolved.length;

      const capped: DisplayLike[] = [];
      const uncapped: DisplayLike[] = [];

      for (const child of unresolved) {
        const maxOuterHeight = LayoutDimensions.maxOuterHeight(child.view());

        if (maxOuterHeight !== null && maxOuterHeight < share) {
          autoHeights.set(child, maxOuterHeight);
          available -= maxOuterHeight;

          const margin = child.view().margin();
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

    const columns: {
      child: DisplayLike;
      height: number;
      outerHeight: number;
      margin: Insets;
    }[][] = [[]];

    const shouldWrap = component.wrap() !== "no-wrap";

    for (const child of normalChildren) {
      const margin = child.margin();
      const height =
        child.height() === "auto"
          ? (autoHeights.get(child) ?? 0)
          : LayoutDimensions.requestedOuterHeight(child, bounds.height)!;
      const outerHeight = margin.top + height + margin.bottom;
      const column = columns[columns.length - 1];
      const columnHeight = column.reduce(
        (total, item) => total + item.outerHeight + component.gap(),
        0,
      );

      if (columnHeight + outerHeight >= bounds.height && shouldWrap) {
        columns.push([]);
      }

      columns[columns.length - 1].push({
        child,
        height,
        outerHeight,
        margin,
      });
    }

    const columnWidth = bounds.width / columns.length;
    let x = bounds.x;

    if (component.wrap() === "wrap-reverse") {
      columns.reverse();
    }

    for (const column of columns) {
      const columnHeight = column.reduce(
        (total, item) => item.outerHeight + total,
        0,
      );

      let y = bounds.y;
      let spacing = 0;

      if (component.alignContent() === "end") {
        y = bounds.height - columnHeight;
      } else if (component.alignContent() === "center") {
        y = Math.round(bounds.height / 2 - columnHeight / 2);
      } else if (component.alignContent() === "space-between") {
        const available = bounds.height - columnHeight;
        spacing = Math.round(available / (column.length - 1));
      } else if (component.alignContent() === "space-evenly") {
        const available = bounds.height - columnHeight;
        spacing = Math.round(available / (column.length + 1));
      } else if (component.alignContent() === "space-around") {
        const available = Math.round(bounds.height - columnHeight);
        spacing = Math.round(available / column.length);
        y += Math.floor(spacing / 2);
      }

      const maxW = column.reduce((total, item) => {
        return Math.max(
          total,
          this.getWidth(item.child, bounds.width, columnWidth),
        );
      }, 0);

      if (component.justifyContent() === "center") {
        x += Math.floor(bounds.width / 2) - Math.round(maxW / 2);
      } else if (component.justifyContent() == "end") {
        x += bounds.width - maxW;
      } else if (component.justifyContent() === "start") {
      }

      for (const item of column) {
        const { child, margin } = item;
        const width =
          LayoutDimensions.requestedOuterWidth(child.view(), bounds.width) ??
          Math.max(0, columnWidth - margin.left - margin.right);

        y += margin.top;

        if (component.alignContent() === "space-evenly") {
          y += spacing;
        }

        child.view().arrange({
          x: x + margin.left,
          y,
          width,
          height: item.height,
        });

        if (
          component.alignContent() === "space-between" ||
          component.alignContent() === "space-around"
        ) {
          y += spacing;
        }

        y += item.height + margin.bottom + component.gap();
      }

      x += columnWidth;
    }
  }

  static getWidth(item: DisplayLike, initial: number, totalWidth: number) {
    return (
      LayoutDimensions.requestedOuterWidth(item.view(), initial) ??
      Math.max(
        0,
        totalWidth - item.view().margin().left - item.view().margin().right,
      )
    );
  }

  static getHeight(
    displayLike: DisplayLike,
    initial: number,
    totalHeight: number,
  ): number {
    const component = displayLike.view();
    return (
      LayoutDimensions.requestedOuterHeight(component, initial) ??
      Math.max(
        0,
        totalHeight - component.view().margin().top - component.margin().bottom,
      )
    );
  }

  static ArrangeHorizontal(displayLike: DisplayLike, bounds: LayoutBounds) {
    const component = displayLike.view();
    const normalChildren = component.view().normalChildren();

    let remainingWidth = this.calculateRemainingWidth(
      bounds.width,
      normalChildren,
    );

    const autoChildren = normalChildren.filter(
      (child) => child.width() === "auto",
    );

    const autoWidths = new Map<DisplayLike, number>();

    let unresolved: DisplayLike[] = [...autoChildren];
    let available = remainingWidth;

    while (unresolved.length > 0) {
      const share = available / unresolved.length;

      const capped: DisplayLike[] = [];
      const uncapped: DisplayLike[] = [];

      for (const child of unresolved) {
        const maxOuterWidth = LayoutDimensions.maxOuterWidth(child.view());

        if (maxOuterWidth !== null && maxOuterWidth < share) {
          autoWidths.set(child, maxOuterWidth);
          available -= maxOuterWidth;
          capped.push(child);
        } else {
          uncapped.push(child);
        }
      }

      if (capped.length === 0) {
        for (const child of uncapped) {
          autoWidths.set(
            child,
            Math.max(0, share, child.view().measuredSize().width),
          );
        }

        break;
      }

      unresolved = uncapped;
      available = Math.max(0, available);
    }

    const rows: RowItem[][] = [[]];

    const shouldWrap = component.view().wrap() !== "no-wrap";

    for (const child of normalChildren) {
      const margin = child.margin();

      const width =
        child.width() === "auto"
          ? (autoWidths.get(child) ?? 0)
          : LayoutDimensions.requestedOuterWidth(child, bounds.width)!;

      const outerWidth = margin.left + width + margin.right;
      const row = rows[rows.length - 1];

      const rowWidth = row.reduce((total, item) => total + item.outerWidth, 0);

      if (
        row.length > 0 &&
        rowWidth + outerWidth > bounds.width &&
        shouldWrap
      ) {
        rows.push([]);
      }

      rows[rows.length - 1].push({
        child,
        width,
        outerWidth,
        margin,
      });
    }

    const rowHeight = bounds.height / rows.length;

    let y = bounds.y;

    if (component.view().wrap() === "wrap-reverse") {
      rows.reverse();
    }

    for (const row of rows) {
      let startX = bounds.x;

      const rowWidth = row.reduce(
        (total, item) =>
          total +
          item.width +
          item.margin.left +
          item.margin.right +
          component.view().gap(),
        0,
      );

      let spacing = 0;

      if (component.justifyContent() === "center") {
        startX += Math.floor(bounds.width / 2) - Math.floor(rowWidth / 2);
      } else if (component.justifyContent() === "end") {
        startX += bounds.width - rowWidth;
      } else if (component.justifyContent() === "start") {
        startX = bounds.x;
      } else if (component.justifyContent() === "space-evenly") {
        const available = bounds.width - rowWidth;
        spacing = Math.round(available / (row.length + 1));
      } else if (component.justifyContent() === "space-around") {
        const available = bounds.width - rowWidth;
        spacing = Math.round(available / row.length);
        startX += Math.round(spacing / 2);
      } else if (component.justifyContent() === "space-between") {
        const available = bounds.width - rowWidth;
        spacing = available / (row.length - 1);
      }

      const maxHeight = row.reduce(
        (max, item) =>
          Math.max(max, this.getHeight(item.child, bounds.height, rowHeight)),
        0,
      );

      if (component.alignContent() === "center") {
        y += Math.floor(bounds.height / 2) - Math.floor(maxHeight / 2);
      } else if (component.alignContent() == "end") {
        y += bounds.height - maxHeight;
      }

      for (let i = 0; i < row.length; i++) {
        const item = row[i];
        const child = item.child.view();
        const margin = item.margin;
        const height = this.getHeight(item.child, bounds.height, rowHeight);

        startX += margin.left;

        if (component.justifyContent() === "space-evenly") {
          startX += spacing;
        }

        child.arrange({
          x: startX,
          y: y + margin.top,
          width: item.width,
          height,
        });

        if (
          component.justifyContent() === "space-between" ||
          component.justifyContent() === "space-around"
        ) {
          startX += spacing;
        }

        startX += component.gap();
        startX += item.width + margin.right;
      }

      y += rowHeight;
    }
  }
  static calculateRemainingWidth(available: number, components: DisplayLike[]) {
    let remainingWidth = available;
    // First consume children with explicit widths.
    for (const childLike of components) {
      const child = childLike.view();

      const width = LayoutDimensions.requestedOuterWidth(child, available)!;
      if (child.width() === "auto") {
        continue;
      }

      const margin = child.margin();

      remainingWidth -= width;
      remainingWidth -= margin.left + margin.right;
    }

    remainingWidth = Math.max(0, remainingWidth);

    const autoChildren = components.filter(
      (child) => child.view().width() === "auto",
    );

    // Remove auto children's margins before distributing
    // the remaining space between their actual widths.
    for (const child of autoChildren) {
      const margin = child.view().margin();

      remainingWidth -= margin.left + margin.right;
    }

    remainingWidth = Math.max(0, remainingWidth);

    return remainingWidth;
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

  static Measure(component: DisplayLike, constraints: MeasureConstraints) {
    component.view().measure(constraints);

    return this;
  }
  static Calculate(root: DisplayLike) {
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(root.view().layout().width),
    );
    LayoutEngine.Arrange(root);
  }

  static Arrange(rootLike: DisplayLike, bounds?: LayoutBounds) {
    const root = rootLike.view();
    const layout = root.layout();
    const measured = root.measuredSize();

    root.arrange(
      bounds || {
        x: layout.x,
        y: layout.y,
        width: layout.width || measured.width,
        height: layout.height || measured.height,
      },
    );

    return this;
  }
  static Layout(
    component: DisplayLike,
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

  static Contains(cursor: LayoutBounds, bounds: LayoutBounds) {
    return (
      cursor.x >= bounds.x &&
      cursor.x < bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y < bounds.y + bounds.height
    );
  }

  static ClampSize(
    width: number,
    height: number,
    constraints: MeasureConstraints,
  ): MeasuredSize {
    return {
      width: Math.max(
        constraints.minWidth,
        Math.min(width, constraints.maxWidth),
      ),
      height: Math.max(
        constraints.minHeight,
        Math.min(height, constraints.maxHeight),
      ),
    };
  }
}
