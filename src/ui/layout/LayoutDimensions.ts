import { DisplayComponent, parseSize } from "../components/components.js";
import { LayoutEngine } from "./layout.js";
import { LayoutBounds } from "./layoutStyle.js";

export class LayoutDimensions {
  static horizontalExtras(component: DisplayComponent) {
    const padding = component.padding();
    const border = component.border();

    return padding.left + padding.right + border.left() + border.right();
  }

  static verticalExtras(component: DisplayComponent) {
    const padding = component.padding();
    const border = component.border();

    return padding.top + padding.bottom + border.top() + border.bottom();
  }

  static outerWidth(component: DisplayComponent, contentWidth: number) {
    return contentWidth + this.horizontalExtras(component);
  }

  static outerHeight(component: DisplayComponent, contentHeight: number) {
    return contentHeight + this.verticalExtras(component);
  }

  static maxOuterWidth(component: DisplayComponent) {
    const maxWidth = component.maxWidth();

    return maxWidth === null ? null : this.outerWidth(component, maxWidth);
  }

  static maxOuterHeight(component: DisplayComponent) {
    const maxHeight = component.maxHeight();

    return maxHeight === null ? null : this.outerHeight(component, maxHeight);
  }
  static requestedOuterWidth(
    component: DisplayComponent,
    availableWidth: number,
  ) {
    let contentWidth = parseSize(component.width(), availableWidth);

    if (component.width() === "fit-content") {
      const measured = component.measuredSize();

      if (component.hasChildren()) {
        const constraints = LayoutEngine.CreateConstraints(measured.width, 1);

        constraints.maxWidth = Math.max(measured.width, availableWidth);
        constraints.minWidth = Math.min(measured.width, availableWidth);

        const horizontal = this.measureHorizontal(
          component.children(),
          constraints,
        );

        contentWidth = horizontal.width;
      } else if (component.hasContent()) {
        contentWidth = component.content().width();
      }
    }

    return contentWidth === null
      ? null
      : this.outerWidth(component, contentWidth);
  }
  static requestedOuterHeight(
    component: DisplayComponent,
    availableHeight: number,
  ) {
    let contentHeight = parseSize(component.height(), availableHeight);

    if (component.height() === "fit-content") {
      const measured = component.measuredSize();

      if (component.hasChildren()) {
        const constraints = LayoutEngine.CreateConstraints(
          measured.width,
          measured.height,
        );
        constraints.maxHeight = Math.max(measured.height, availableHeight);
        constraints.minHeight = Math.min(measured.height, availableHeight);

        const horizontal = this.measureVertical(
          component.children(),
          constraints,
        );

        contentHeight = horizontal.height;
      } else if (component.hasContent()) {
        contentHeight = component.content().height();
      }
    }
    return contentHeight === null
      ? null
      : this.outerHeight(component, contentHeight);
  }

  /**
   * Apply maxWidth/maxHeight belonging to this component.
   */
  static applyStyleConstraints(
    component: DisplayComponent,
    constraints: MeasureConstraints,
  ): MeasureConstraints {
    return {
      minWidth: constraints.minWidth,
      maxWidth:
        component.maxWidth() === null
          ? constraints.maxWidth
          : Math.min(constraints.maxWidth, this.maxOuterWidth(component)!),

      minHeight: constraints.minHeight,

      maxHeight:
        component.maxHeight() === null
          ? constraints.maxHeight
          : Math.min(constraints.maxHeight, this.maxOuterHeight(component)!),
    };
  }

  static measureVertical(
    children: DisplayComponent[],
    constraints: MeasureConstraints,
  ): MeasuredSize {
    let width = 0;
    let height = 0;

    for (const child of children) {
      const margin = child.margin();

      const childConstraints: MeasureConstraints = {
        minWidth: 0,
        maxWidth: Math.max(
          0,
          constraints.maxWidth - margin.left - margin.right,
        ),

        minHeight: 0,
        maxHeight: Math.max(
          0,
          constraints.maxHeight - margin.top - margin.bottom,
        ),
      };

      const childSize = child.measure(childConstraints);

      width = Math.max(width, childSize.width + margin.left + margin.right);

      height += childSize.height + margin.top + margin.bottom;
    }

    return {
      width,
      height,
    };
  }
  static measureHorizontal(
    children: DisplayComponent[],
    constraints: MeasureConstraints,
  ): MeasuredSize {
    let width = 0;
    let height = 0;

    let childConstraints = LayoutEngine.CreateConstraints(0);

    for (const child of children) {
      const margin = child.margin();

      childConstraints.maxWidth = Math.max(
        0,
        constraints.maxWidth - margin.left - margin.right,
      );
      childConstraints.maxHeight = Math.max(
        0,
        constraints.maxHeight - margin.top - margin.bottom,
      );

      const childSize = child.measure(childConstraints);

      width += childSize.width + margin.left + margin.right;

      height = Math.max(height, childSize.height + margin.top + margin.bottom);
    }

    return {
      width,
      height,
    };
  }

  /**
   * Apply this component's own max dimensions to its final arranged bounds.
   */
  static resolveArrangedBounds(
    component: DisplayComponent,
    bounds: LayoutBounds,
  ): LayoutBounds {
    let width = bounds.width;
    let height = bounds.height;

    const maxWidth = this.maxOuterWidth(component);
    if (maxWidth !== null) {
      width = Math.min(width, maxWidth);
    }

    const maxHeight = this.maxOuterHeight(component);
    if (maxHeight !== null) {
      height = Math.min(height, maxHeight);
    }

    return {
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      width: Math.floor(Math.max(0, width)),
      height: Math.floor(Math.max(0, height)),
    };
  }
}
