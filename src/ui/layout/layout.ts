import { start } from "node:repl";
import { DisplayComponent, parseSize } from "../components/components.js";
import { LayoutDimensions } from "./LayoutDimensions.js";
import { LayoutBounds } from "./layoutStyle.js";
import { assert } from "node:console";

type RowItem = {
  child: DisplayComponent;
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

  static ArrangeAbsolute(child: DisplayComponent, bounds: LayoutBounds) {
    const width =
      LayoutDimensions.requestedOuterWidth(child, bounds.width) ??
      child.measuredSize().width;

    const height =
      LayoutDimensions.requestedOuterHeight(child, bounds.height) ??
      child.measuredSize().height;

    const margin = child.margin();
    const x = (parseSize(child.startX(), bounds.width) ?? 0) + margin.left;

    const y = (parseSize(child.startY(), bounds.height) ?? 0) + margin.top;

    child.arrange({
      x: bounds.x + x,
      y: bounds.y + y,
      width,
      height,
    });
  }

  static ArrangeVertical(component: DisplayComponent, bounds: LayoutBounds) {
    let remainingHeight = bounds.height;

    const normalChildren = component.normalChildren();

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
    const autoHeights = new Map<DisplayComponent, number>();

    let unresolved = [...autoChildren];
    let available = remainingHeight;

    while (unresolved.length > 0) {
      const share = available / unresolved.length;

      const capped: DisplayComponent[] = [];
      const uncapped: DisplayComponent[] = [];

      for (const child of unresolved) {
        const maxOuterHeight = LayoutDimensions.maxOuterHeight(child);

        if (maxOuterHeight !== null && maxOuterHeight < share) {
          autoHeights.set(child, maxOuterHeight);
          available -= maxOuterHeight;

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

    const columns: {
      child: DisplayComponent;
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

      if (
        column.length > 0 &&
        columnHeight + outerHeight >= bounds.height &&
        shouldWrap
      ) {
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
      }

      if (component.justifyContent() === "center") {
      } else if (component.justifyContent() == "end") {
      } else if (component.justifyContent() === "start") {
      }

      for (const item of column) {
        const { child, margin } = item;
        const width =
          LayoutDimensions.requestedOuterWidth(child, bounds.width) ??
          Math.max(0, columnWidth - margin.left - margin.right);

        y += margin.top;

        if (component.alignContent() === "space-evenly") {
          y += spacing;
        }

        child.arrange({
          x: x + margin.left,
          y,
          width,
          height: item.height,
        });

        if (component.alignContent() === "space-between") {
          y += spacing;
        }

        y += item.height + margin.bottom + component.gap();
      }

      x += columnWidth;
    }
  }

  static ArrangeHorizontal(component: DisplayComponent, bounds: LayoutBounds) {
    const normalChildren = component.normalChildren();

    let remainingWidth = this.calculateRemainingWidth(
      bounds.width,
      normalChildren,
    );

    const autoChildren = normalChildren.filter(
      (child) => child.width() === "auto",
    );

    const autoWidths = new Map<DisplayComponent, number>();

    let unresolved = [...autoChildren];
    let available = remainingWidth;

    while (unresolved.length > 0) {
      const share = available / unresolved.length;

      const capped: DisplayComponent[] = [];
      const uncapped: DisplayComponent[] = [];

      for (const child of unresolved) {
        const maxOuterWidth = LayoutDimensions.maxOuterWidth(child);

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
          autoWidths.set(child, Math.max(0, share, child.measuredSize().width));
        }

        break;
      }

      unresolved = uncapped;
      available = Math.max(0, available);
    }

    const rows: RowItem[][] = [[]];

    const shouldWrap = component.wrap() !== "no-wrap";

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

    if (component.wrap() === "wrap-reverse") {
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
          component.gap(),
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
        spacing = available / row.length;
        startX += Math.round(spacing / 2);
      } else if (component.justifyContent() === "space-between") {
        const available = bounds.width - rowWidth;
        spacing = available / (row.length - 1);
      }

      const getHeight = (item: RowItem) => {
        return (
          LayoutDimensions.requestedOuterHeight(item.child, bounds.height) ??
          Math.max(
            0,
            rowHeight - item.child.margin().top - item.child.margin().bottom,
          )
        );
      };
      const maxHeight = row.reduce(
        (max, item) => Math.max(max, getHeight(item)),
        0,
      );

      if (component.alignContent() === "center") {
        y += Math.floor(bounds.height / 2) - Math.floor(maxHeight / 2);
      } else if (component.alignContent() == "end") {
        y += bounds.height - maxHeight;
      } else if (component.alignContent() === "start") {
        y = bounds.y;
      }

      for (let i = 0; i < row.length; i++) {
        const item = row[i];
        const child = item.child;
        const margin = item.margin;
        const height = getHeight(item);

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
  static calculateRemainingWidth(
    available: number,
    components: DisplayComponent[],
  ) {
    let remainingWidth = available;
    // First consume children with explicit widths.
    for (const child of components) {
      const width = LayoutDimensions.requestedOuterWidth(child, available)!;
      if (child.width() === "auto") {
        continue;
      }

      const margin = child.margin();

      remainingWidth -= width;
      remainingWidth -= margin.left + margin.right;
    }

    remainingWidth = Math.max(0, remainingWidth);

    const autoChildren = components.filter((child) => child.width() === "auto");

    // Remove auto children's margins before distributing
    // the remaining space between their actual widths.
    for (const child of autoChildren) {
      const margin = child.margin();

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

  static Measure(component: DisplayComponent, constraints: MeasureConstraints) {
    component.measure(constraints);

    return this;
  }

  static Arrange(root: DisplayComponent, bounds?: LayoutBounds) {
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
