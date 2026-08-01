import { assert } from "../assert.js";

export class LayoutEngine {
  static CreateBounds(): LayoutBounds {
    return {
      x: 0,
      y: 0,
      height: 0,
      width: 0,
    };
  }
  static Measure(root: Component, layout: LayoutBounds): Component {
    root.setLayout(layout);

    if (root.direction() === "vertical") {
      this.layoutVertical(root);
    } else if (root.direction() === "horizontal") {
      this.layoutHorizontal(root);
    }
    return root;
  }
  private static layoutVertical(component: Component) {
    let parent = component.layout();
    let flexible = 0;
    let remaining = parent.height;

    for (const child of component.children()) {
      const measured = child.measure(parent);

      if (Number.isFinite(measured.height)) {
        remaining -= measured.height!;
      } else if (Number.isFinite(child.maxHeight())) {
        remaining -= child.maxHeight()!;
      } else {
        flexible++;
      }
    }
    let y = parent.y;
    for (const child of component.children()) {
      let measured = child.measure(parent);

      let height: number;
      let isFlexible = false;
      if (Number.isFinite(measured.height)) {
        height = measured.height!;
      } else if (Number.isFinite(child.maxHeight())) {
        height = child.maxHeight()!;
      } else {
        height = Math.floor(remaining / flexible);
        isFlexible = true;
      }

      this.Measure(child, {
        height: height,
        y: y,
        width: parent.width,
        x: parent.x,
      });

      y += height;

      if (isFlexible) {
        remaining -= height;
        flexible--;
      }
    }
  }

  private static layoutHorizontal(component: Component) {
    const parent = component.layout();

    let remaining = parent.width;

    let flexible = 0;

    for (const child of component.children()) {
      const measured = child.measure(parent);

      if (Number.isFinite(measured.width)) {
        remaining -= measured.width!;
      } else if (Number.isFinite(child.maxWidth())) {
        remaining -= child.maxWidth()!;
      } else {
        flexible++;
      }

      assert(
        !isNaN(remaining),
        `remaining is not a number on id ${child.getId()}`,
      );
    }
    let x = parent.x;

    for (const child of component.children()) {
      const measured = child.measure(parent);

      let w: number;
      let isFlexible = false;

      if (Number.isFinite(measured.width)) {
        w = measured.width!;
      } else if (Number.isFinite(child.maxWidth())) {
        w = child.maxWidth()!;
      } else {
        w = Math.floor(remaining / flexible);
        isFlexible = true;
      }
      assert(
        Boolean(w),
        `width came on undefined on ${child.getId()}. measured: ${measured.width}. maxW: ${child.maxWidth()}, flex: ${Math.floor(remaining / flexible)}, w:${w}`,
      );
      this.Measure(child, {
        x,
        y: parent.y,
        width: w,
        height: parent.height,
      });
      x += w;
      if (isFlexible) {
        remaining -= w;
        flexible--;
      }
    }
    assert(
      remaining === 0,
      `not using all remaining. expected: 0, got ${remaining}`,
    );
  }
}
