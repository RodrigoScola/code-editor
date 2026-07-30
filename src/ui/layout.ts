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

      if (measured.height !== null) {
        remaining -= measured.height!;
      } else if (child.maxHeight() !== null) {
        remaining -= child.maxHeight()!;
      } else {
        flexible++;
      }
    }
    let y = parent.y;
    for (const child of component.children()) {
      let measured = child.measure(parent);

      let height: number;
      if (measured.height !== null) {
        height = measured.height!;
      } else if (child.maxHeight() !== null) {
        height = Math.min(child.maxHeight()!, Math.floor(remaining / flexible));
      } else {
        height = Math.floor(remaining / flexible);
      }

      this.Measure(child, {
        height: height,
        y: y,
        width: parent.width,
        x: parent.x,
      });

      y += height;
      remaining -= height;

      if (measured.height == null || child.maxHeight() == null) {
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

      if (measured.width !== null) {
        remaining -= measured.width!;
      } else if (child.maxWidth() !== null) {
        remaining -= child.maxWidth()!;
      } else {
        flexible++;
      }
    }
    let x = parent.x;

    for (const child of component.children()) {
      const measured = child.measure(parent);

      let w: number;

      if (measured.width !== null) {
        w = measured.width!;
      } else if (child.maxWidth() !== null) {
        w = Math.min(child.maxWidth()!, Math.floor(remaining / flexible));
      } else {
        w = Math.floor(remaining / flexible);
      }
      this.Measure(child, {
        x,
        y: parent.y,
        width: w,
        height: parent.height,
      });
      x += w;
      remaining -= w;
      if (measured.width !== null && child.maxWidth() !== null) {
        flexible--;
      }
    }
  }
}
