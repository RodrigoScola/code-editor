import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { UiComponent } from "../../../../src/ui/components/UiComponent.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Canvas } from "../../../../src/ui/canvas.js";
import { cell, layoutAndPaint, screen } from "../../../helpers/ui.js";

// How a component's final style is worked out:
//
//   explicit value on the component       (setBold(false) counts as explicit)
//   > class styles from the nearest stylesheet
//   > the parent's final style            (all the way up, not just one level)
//   > terminal default
//
// So a style property needs three states: unset, true/value, false. Today
// "false" and "unset" are the same, and booleans are OR'ed with the parent.
//
// Proposed API:
//   uiComponent.setFocusStyles(style)     blended over while focused
//   component.setStyleSheet({ className: style })   applies to descendants
//   component.addClass(name) / removeClass(name) / hasClass(name)

// root (styled) → middle (nothing set) → leaf "x" (nothing set)
function threeLevels(style: (root: DisplayComponent) => void) {
  const { canvas, root } = screen(4, 1);
  const middle = new DisplayComponent();
  const leaf = new DisplayComponent().setContent("x");
  middle.addChildren(leaf);
  root.addChildren(middle);
  style(root);

  layoutAndPaint(root, canvas);

  return { canvas, leaf };
}

describe("inheritance goes through every ancestor", () => {
  it("background", () => {
    const { canvas } = threeLevels((root) =>
      root.setBackgroundColor(colors.BLUE_BACKGROUND),
    );

    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.BLUE_BACKGROUND);
    expect(cell(canvas, 3, 0).backgroundColor()).eq(colors.BLUE_BACKGROUND);
  });

  it("text color", () => {
    const { canvas } = threeLevels((root) =>
      root.setColor(colors.RED_FOREGROUND),
    );

    expect(cell(canvas, 0, 0).color()).eq(colors.RED_FOREGROUND);
  });

  it("bold", () => {
    const { canvas } = threeLevels((root) => root.setBold(true));

    expect(cell(canvas, 0, 0).isBold()).eq(true);
  });
});

describe("a child can turn off what it inherits", () => {
  it("setBold(false) wins over a bold parent", () => {
    const { canvas, root } = screen(4, 2);
    root.setBold(true);
    const plain = new DisplayComponent().setContent("x").setBold(false);
    const inherits = new DisplayComponent().setContent("y");
    root.addChildren([plain, inherits]);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).isBold()).eq(false);
    expect(cell(canvas, 0, 1).isBold()).eq(true);
  });

  it("setUnderline(false) wins over an underlined parent", () => {
    const { canvas, root } = screen(4, 1);
    root.setUnderline(true);
    root.addChildren(new DisplayComponent().setContent("x").setUnderline(false));

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).isUnderline()).eq(false);
  });

  it("a child that turned bold off passes that on to its own children", () => {
    const { canvas, root } = screen(4, 1);
    root.setBold(true);
    const plain = new DisplayComponent().setBold(false);
    plain.addChildren(new DisplayComponent().setContent("x"));
    root.addChildren(plain);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).isBold()).eq(false);
  });
});

describe("focus styles", () => {
  function focusable() {
    const component = new UiComponent();
    const canvas = new Canvas().setLayout(LayoutEngine.CreateBounds(4, 1));
    component.view().setLayout(LayoutEngine.CreateBounds(4, 1));
    component.view().setBackgroundColor(colors.BLUE_BACKGROUND);
    component.setFocusStyles(
      ComponentStyle.Create().setBackgroundColor(colors.GREEN_BACKGROUND),
    );
    return { component, canvas };
  }

  it("are not used while the component is not focused", () => {
    const { component, canvas } = focusable();

    layoutAndPaint(component, canvas);

    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.BLUE_BACKGROUND);
  });

  it("are blended over the normal style while focused", () => {
    const { component, canvas } = focusable();

    component.focus();
    layoutAndPaint(component, canvas);

    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.GREEN_BACKGROUND);
  });

  it("go away on blur", () => {
    const { component, canvas } = focusable();

    component.focus();
    layoutAndPaint(component, canvas);
    component.blur();
    layoutAndPaint(component, canvas);

    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.BLUE_BACKGROUND);
  });
});

describe("classes and stylesheets", () => {
  const warning = () => ComponentStyle.Create().setColor(colors.YELLOW_FOREGROUND);

  it("a class picks up its style from an ancestor's stylesheet", () => {
    const { canvas, root } = screen(4, 1);
    root.setStyleSheet({ warning: warning() });
    const middle = new DisplayComponent();
    const label = new DisplayComponent().setContent("x");
    label.addClass("warning");
    middle.addChildren(label);
    root.addChildren(middle);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).color()).eq(colors.YELLOW_FOREGROUND);
  });

  it("styles set on the component win over its class", () => {
    const { canvas, root } = screen(4, 1);
    root.setStyleSheet({ warning: warning() });
    const label = new DisplayComponent()
      .setContent("x")
      .setColor(colors.RED_FOREGROUND);
    label.addClass("warning");
    root.addChildren(label);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).color()).eq(colors.RED_FOREGROUND);
  });

  it("class styles win over inherited ones", () => {
    const { canvas, root } = screen(4, 1);
    root.setColor(colors.RED_FOREGROUND).setStyleSheet({ warning: warning() });
    const label = new DisplayComponent().setContent("x");
    label.addClass("warning");
    root.addChildren(label);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).color()).eq(colors.YELLOW_FOREGROUND);
  });

  it("removeClass goes back to the inherited style", () => {
    const { canvas, root } = screen(4, 1);
    root.setColor(colors.RED_FOREGROUND).setStyleSheet({ warning: warning() });
    const label = new DisplayComponent().setContent("x");
    label.addClass("warning");
    root.addChildren(label);

    layoutAndPaint(root, canvas);
    label.removeClass("warning");
    layoutAndPaint(root, canvas);

    expect(label.hasClass("warning")).eq(false);
    expect(cell(canvas, 0, 0).color()).eq(colors.RED_FOREGROUND);
  });

  it("swapping the stylesheet restyles everything (themes)", () => {
    const { canvas, root } = screen(4, 1);
    const label = new DisplayComponent().setContent("x");
    label.addClass("panel");
    root.addChildren(label);

    root.setStyleSheet({
      panel: ComponentStyle.Create().setBackgroundColor(colors.BLACK_BACKGROUND),
    });
    layoutAndPaint(root, canvas);
    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.BLACK_BACKGROUND);

    root.setStyleSheet({
      panel: ComponentStyle.Create().setBackgroundColor(colors.WHITE_BACKGROUND),
    });
    layoutAndPaint(root, canvas);
    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.WHITE_BACKGROUND);
  });
});
