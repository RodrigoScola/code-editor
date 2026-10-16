import { LayoutEngine } from "../layout/layout.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
import { LayoutDimensions } from "../layout/LayoutDimensions.js";
import { DisplayComponent, parseSize } from "./displayComponent.js";

export class ComponentLayout {
  private component: DisplayComponent;

  private _measuredWith: MeasureConstraints = {
    maxHeight: -1,
    maxWidth: -1,
    minHeight: -1,
    minWidth: -1,
  };

  private constrainedLayout: MeasureConstraints = {
    maxHeight: 0,
    maxWidth: 0,
    minHeight: 0,
    minWidth: 0,
  };

  private _measuredSize: MeasuredSize = {
    height: 0,
    width: 0,
  };
  constructor(component: DisplayComponent) {
    this.component = component;
  }
  measured() {
    return this._measuredWith;
  }

  measure(constraints: MeasureConstraints): MeasuredSize {
    if (
      !this.component.dirty() &&
      LayoutEngine.SameConstraints(this.measured(), constraints)
    ) {
      return this.measuredSize();
    }
    this.setMeasured(constraints);

    let styleConstraints = LayoutDimensions.applyStyleConstraints(
      this.component,
      constraints,
    );

    const contentConstraints = this.constraints(styleConstraints);
    const contentSize = this.measureContent(contentConstraints);

    // auto sizes fit the content, but stay inside the space given
    const fitted = LayoutEngine.ClampSize(
      contentSize.width +
        this.component.horizontalPadding() +
        this.component.horizontalBorder(),
      contentSize.height +
        this.component.verticalPadding() +
        this.component.verticalBorder(),
      styleConstraints,
    );

    // an explicit size is not shrunk to the space given: it overflows the
    // parent, like CSS. Only its own maxWidth/maxHeight limit it, the same
    // rule arrange uses, so measuredSize() matches the final layout
    const width =
      parseSize(this.component.width(), styleConstraints.maxWidth) === null
        ? fitted.width
        : Math.max(
            styleConstraints.minWidth,
            LayoutDimensions.requestedOuterWidth(
              this.component,
              styleConstraints.maxWidth,
            )!,
          );

    const height =
      parseSize(this.component.height(), styleConstraints.maxHeight) === null
        ? fitted.height
        : Math.max(
            styleConstraints.minHeight,
            LayoutDimensions.requestedOuterHeight(
              this.component,
              styleConstraints.maxHeight,
            )!,
          );

    this.setMeasuredSize(width, height);

    return this.measuredSize();
  }

  protected measureContent(constraints: MeasureConstraints): MeasuredSize {
    const component = this.component;
    const children = component.children();
    const text = component.text();
    const textSize =
      text === undefined
        ? { width: 0, height: 0 }
        : {
            width: Math.max(...text.split("\n").map((line) => line.length)),
            height: text.split("\n").length,
          };

    if (children.length === 0) {
      return textSize;
    }

    // hidden children take no space, so they add nothing to the size either
    const flowChildren = children.filter(
      (child) => child.positionMode() === "normal" && child.visible(),
    );

    if (flowChildren.length === 0) {
      return textSize;
    }

    const childSize =
      component.direction() === "horizontal"
        ? LayoutDimensions.measureHorizontal(flowChildren, constraints)
        : LayoutDimensions.measureVertical(flowChildren, constraints);

    if (component.direction() === "horizontal") {
      return {
        width: Math.max(childSize.width, textSize.width),
        height: Math.max(childSize.height, textSize.height),
      };
    }

    return {
      width: Math.max(childSize.width, textSize.width),
      height: Math.max(childSize.height, textSize.height),
    };
  }

  // copies the values in, so the caller's object can be reused or changed
  // without moving this component's size
  setMeasuredSize(width: number, height: number): void;
  setMeasuredSize(size: MeasuredSize): void;
  setMeasuredSize(sizeOrWidth: MeasuredSize | number, height?: number): void {
    if (typeof sizeOrWidth === "number") {
      this._measuredSize.width = sizeOrWidth;
      this._measuredSize.height = height ?? 0;
      return;
    }
    this._measuredSize.width = sizeOrWidth.width;
    this._measuredSize.height = sizeOrWidth.height;
  }

  measuredSize() {
    return this._measuredSize;
  }
  clip(): LayoutBounds | null {
    const component = this.component;
    let clip: LayoutBounds | null = null;

    for (let parent = component.parent(); parent; parent = parent.parent()) {
      if (parent.overflow() === "visible") {
        continue;
      }

      const layout = parent.paddingLayout().clone();
      const hbar = parent.horizontalScrollbar();
      if (hbar) {
        layout.setHeight(layout.height - hbar.height());
      }
      const vbar = parent.verticalScrollbar();
      if (vbar) {
        layout.setWidth(layout.width - vbar.height());
      }

      clip = intersectBounds(clip, layout);
    }

    return clip;
  }

  private _paddingLayoutBounds = new LayoutBounds();
  paddingLayout(): LayoutBounds {
    const component = this.component;
    const layout = component.layout();
    const border = component.border();

    this._paddingLayoutBounds
      .setX(layout.x + border.left())
      .setY(layout.y + border.top())
      .setWidth(Math.max(0, layout.width - border.left() - border.right()))
      .setHeight(Math.max(0, layout.height - border.top() - border.bottom()));

    return this._paddingLayoutBounds;
  }

  private _layoutBounds = new LayoutBounds();
  content(): LayoutBounds {
    const component = this.component;
    const layout = component.layout();
    const padding = component.padding();
    const border = component.border();

    const bar = component.verticalScrollbar();
    const verticalBar = bar ? bar.width() : 0;
    const hbar = component.horizontalScrollbar();
    const horizontalBar = hbar ? hbar.height() : 0;

    return this._layoutBounds
      .setX(layout.x + padding.left + border.left())
      .setY(layout.y + padding.top + border.top())
      .setWidth(
        Math.max(
          0,
          layout.width -
            padding.left -
            padding.right -
            border.left() -
            border.right() -
            verticalBar,
        ),
      )
      .setHeight(
        Math.max(
          0,
          layout.height -
            padding.top -
            padding.bottom -
            border.top() -
            border.bottom() -
            horizontalBar,
        ),
      );
  }

  setMeasured(constraints: MeasureConstraints) {
    this._measuredWith.maxHeight = constraints.maxHeight;
    this._measuredWith.maxWidth = constraints.maxWidth;
    this._measuredWith.minWidth = constraints.minWidth;
    this._measuredWith.minHeight = constraints.minHeight;
  }

  // the next measure() runs again instead of reusing its size. The size
  // itself stays: arrange and scrollHeight() read it after this is called
  forgetMeasured() {
    this._measuredWith.maxHeight = -1;
    this._measuredWith.maxWidth = -1;
    this._measuredWith.minHeight = -1;
    this._measuredWith.minWidth = -1;
  }

  reset() {
    this._measuredSize.height = 0;
    this._measuredSize.width = 0;

    this.constrainedLayout.maxHeight = 0;
    this.constrainedLayout.maxWidth = 0;
    this.constrainedLayout.minWidth = 0;
    this.constrainedLayout.minHeight = 0;

    this.forgetMeasured();
  }

  constraints(constraints: MeasureConstraints): MeasureConstraints {
    const padding = this.component.padding();
    const border = this.component.border();

    const horizontal =
      padding.left + padding.right + border.left() + border.right();

    const vertical =
      padding.top + padding.bottom + border.top() + border.bottom();

    this.constrainedLayout.minWidth = Math.max(
      0,
      constraints.minWidth - horizontal,
    );

    this.constrainedLayout.maxWidth = Math.max(
      0,
      constraints.maxWidth - horizontal,
    );

    this.constrainedLayout.minHeight = Math.max(
      0,
      constraints.minHeight - vertical,
    );

    this.constrainedLayout.maxHeight = Math.max(
      0,
      constraints.maxHeight - vertical,
    );

    return this.constrainedLayout;
  }
}
function intersectBounds(
  a: LayoutBounds | null,
  b: LayoutBounds,
): LayoutBounds {
  if (a === null) {
    return b;
  }

  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  return LayoutBounds.Create()
    .setX(x)
    .setY(y)
    .setWidth(Math.max(0, right - x))
    .setHeight(Math.max(0, bottom - y));
}
