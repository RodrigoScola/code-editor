import { DisplayComponent } from "../components/components.js";
import { LayoutEngine } from "./layout.js";

export class LayoutDimensions {
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
          : Math.min(constraints.maxWidth, component.maxWidth()!),

      minHeight: constraints.minHeight,

      maxHeight:
        component.maxHeight() === null
          ? constraints.maxHeight
          : Math.min(constraints.maxHeight, component.maxHeight()!),
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

    if (component.maxWidth() !== null) {
      width = Math.min(width, component.maxWidth()!);
    }

    if (component.maxHeight() !== null) {
      height = Math.min(height, component.maxHeight()!);
    }

    return {
      x: bounds.x,
      y: bounds.y,
      width: Math.max(0, width),
      height: Math.max(0, height),
    };
  }
}
