import assert from "assert";
import { POSITION_ORDER } from "../../constants.js";
import { ICanvas } from "../Canvas/TerminalCanvas.js";
import { DisplayLike } from "../layout/layout.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
import { ComponentStyle } from "../ComponentStyles.js";

export class Rendering {
  static Border(componentLike: DisplayLike, canvas: ICanvas) {
    const component = componentLike.view();
    const bound: LayoutBounds = LayoutBounds.Create();
    const border = component.border();

    const cl = component.paddingLayout();
    const out = border.styles().display();

    border.styles().setBackgroundColor(component.styles().backgroundColor());
    if (border.left() > 0) {
      bound
        .setX(cl.x - border.left())
        .setHeight(cl.height + border.top() + border.bottom())
        .setWidth(border.left())
        .setY(cl.y - border.top());

      border.styles().setDisplay(border.borderStyle().left);
      canvas.fillRect(bound, border.styles());
      border.styles().setDisplay(out);
    }

    if (border.right() > 0) {
      bound.setX(cl.x + cl.width);
      bound.setHeight(cl.height + border.top() + border.bottom());
      bound.setWidth(border.right());
      bound.setY(cl.y - border.top());
      border.styles().setDisplay(border.borderStyle().right);
      canvas.fillRect(bound, border.styles());
      border.styles().setDisplay(out);
    }

    if (border.top() > 0) {
      let width = cl.width + border.left() + border.right();

      let text = border.borderStyle().top.repeat(width);

      if (border.left() > 0 && border.right() > 0) {
        text =
          border.borderStyle().top_left +
          text.slice(1, -1) +
          border.borderStyle().top_right;
      }

      bound
        .setX(cl.x - border.left())
        .setHeight(border.top())
        .setWidth(width)
        .setY(cl.y - border.top());

      canvas.fillRect(bound, border.styles());
      canvas.drawText(bound, text, border.styles());
    }

    if (border.bottom() > 0) {
      let width = cl.width + border.left() + border.right();

      let text = border.borderStyle().bottom.repeat(width);

      if (border.left() > 0 && border.right() > 0) {
        text =
          border.borderStyle().bottom_left +
          text.slice(1, -1) +
          border.borderStyle().bottom_right;
      }
      bound
        .setX(cl.x - border.left())
        .setWidth(width)
        .setY(cl.y + cl.height)
        .setHeight(border.bottom());

      canvas.fillRect(bound, border.styles());
      canvas.drawText(bound, text, border.styles());
    }
    bound.dispose();
  }
  static Content(
    cp: DisplayLike,
    canvas: ICanvas,
    defaultStyle: ComponentStyle,
  ) {
    const component = cp.view();

    canvas.drawText(
      component.contentLayout(),
      component.content(),
      defaultStyle,
      component.viewport(),
    );
  }
  static ScrollBar(cp: DisplayLike, canvas: ICanvas) {
    const component = cp.view();

    const layout = component.paddingLayout();

    const vertical = component.verticalScrollbar();
    const horizontal = component.horizontalScrollbar();

    if (vertical) {
      const y = layout.y;
      let x = layout.width + layout.x - 1;
      let width = vertical.width();
      let height = layout.height;
      let style = vertical.style();
      const sty = style.clone();

      if (horizontal) {
        height -= horizontal.height();
      }

      const bd = layout
        .clone()
        .setX(x)
        .setY(y)
        .setWidth(width)
        .setHeight(height);

      const trackColor = style.trackColor() || style.backgroundColor();

      canvas.fillRect(bd, sty.setBackgroundColor(trackColor));

      const startAt = bd.y + vertical.offset();
      const endAt = startAt + vertical.size();

      const thumbColor = style.thumbColor() || style.backgroundColor();
      sty.setBackgroundColor(thumbColor);
      for (let i = startAt; i < endAt && vertical.style().thumb(); i++) {
        canvas.drawText(bd.setY(i), vertical.style().thumb()!, sty);
      }
    }

    if (horizontal) {
      const y = layout.y + layout.height - 1;
      const x = layout.x;
      const style = horizontal.style();
      let width = layout.width;
      let height = horizontal.height();

      if (vertical) {
        width -= vertical.width();
      }

      const bd = layout
        .clone()
        .setX(x)
        .setY(y)
        .setHeight(height)
        .setWidth(width);

      assert(style, `invalid  style for horizontal scroll`);

      const trackColor = style.trackColor() || style.backgroundColor();
      const sty = style.clone().setBackgroundColor(trackColor);

      canvas.fillRect(bd, sty);

      const startAt = bd.x + horizontal.offset();
      const endAt = startAt + horizontal.size();

      const thumbColor = style.thumbColor() || style.backgroundColor();

      sty.setBackgroundColor(thumbColor);

      for (let i = startAt; i < endAt && style.thumb(); i++) {
        canvas.drawText(bd.setX(i), style.thumb()!, sty);
      }
      bd.dispose();
      sty.dispose();
    }
  }
  private static isAncestor(ancestor: DisplayLike, componentLike: DisplayLike) {
    let parent = componentLike.view().parent();

    while (parent) {
      if (parent === ancestor) {
        return true;
      }

      parent = parent.parent();
    }

    return false;
  }
  static SortComponents(components: DisplayLike[]) {
    return components.sort((aLike, bLike) => {
      const a = aLike.view();
      const b = bLike.view();
      if (Rendering.isAncestor(a, b)) {
        return -1;
      }

      if (Rendering.isAncestor(b, a)) {
        return 1;
      }

      return (
        a.index() - b.index() ||
        POSITION_ORDER[a.positionMode()] - POSITION_ORDER[b.positionMode()]
      );
    });
  }

  static GetComponents(root: DisplayLike) {
    const components: DisplayLike[] = [];

    const visit = (comp: DisplayLike) => {
      if (!comp.view().visible()) {
        return;
      }
      components.push(comp);

      for (const child of comp.view().children()) {
        visit(child);
      }
    };

    visit(root);

    return components;
  }
}
