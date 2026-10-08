import { describe, expect, it } from "vitest";
import { UiComponent } from "../../../../src/ui/components/UiComponent.js";
import { FocusManager } from "../../../../src/ui/windows/FocusManager.js";

// Proposed API for tab order (HTML tabindex semantics):
//
//   component.setTabIndex(n) / component.tabIndex()
//     n > 0   visited first, lowest number first
//     n = 0   visited after those, in tree (depth-first) order
//     n < 0   focusable from code, skipped by tab
//
//   focusManager.focusNext(root) / focusManager.focusPrevious(root)
//     moves focus to the next/previous component under root, wrapping around,
//     and returns it. Hidden or disabled components (and anything inside a
//     hidden one) are skipped.

describe("FocusManager.focus", () => {
  it("blurs the component that had focus before", () => {
    const focus = new FocusManager();
    const first = new UiComponent();
    const second = new UiComponent();

    focus.focus(first);
    focus.focus(second);

    expect(first.isFocused()).eq(false);
    expect(second.isFocused()).eq(true);
    expect(focus.active()).eq(second);
  });

  it("focusing the active component again keeps it focused", () => {
    const focus = new FocusManager();
    const only = new UiComponent();

    focus.focus(only);
    focus.focus(only);

    expect(only.isFocused()).eq(true);
  });
});

function named(name: string, tabIndex: number) {
  const component = new UiComponent().setName(name);
  component.setTabIndex(tabIndex);
  return component;
}

// root
// ├── a
// │   └── b
// └── c
function tabTree() {
  const root = named("root", -1);
  const a = named("a", 0);
  const b = named("b", 0);
  const c = named("c", 0);

  a.addChildren(b);
  root.addChildren([a, c]);

  return { root, a, b, c };
}

function walk(focus: FocusManager, root: UiComponent, steps: number) {
  const names: (string | null | undefined)[] = [];
  for (let i = 0; i < steps; i++) {
    names.push(focus.focusNext(root)?.name());
  }
  return names;
}

describe("tab order", () => {
  it("starts at the first component when nothing is focused", () => {
    const { root } = tabTree();
    const focus = new FocusManager();

    expect(focus.focusNext(root)?.name()).eq("a");
  });

  it("visits components in depth-first tree order and wraps around", () => {
    const { root } = tabTree();
    const focus = new FocusManager();

    expect(walk(focus, root, 4)).toEqual(["a", "b", "c", "a"]);
  });

  it("focusPrevious goes backwards and wraps around", () => {
    const { root, a } = tabTree();
    const focus = new FocusManager();

    focus.focus(a);

    expect(focus.focusPrevious(root)?.name()).eq("c");
    expect(focus.focusPrevious(root)?.name()).eq("b");
    expect(focus.focusPrevious(root)?.name()).eq("a");
  });

  it("moves the actual focus, not just the return value", () => {
    const { root, a, b } = tabTree();
    const focus = new FocusManager();

    focus.focusNext(root);
    focus.focusNext(root);

    expect(focus.active()).eq(b);
    expect(b.isFocused()).eq(true);
    expect(a.isFocused()).eq(false);
  });

  it("skips components with a negative tab index", () => {
    const { root, b } = tabTree();
    const focus = new FocusManager();

    b.setTabIndex(-1);

    expect(walk(focus, root, 3)).toEqual(["a", "c", "a"]);
  });

  it("visits positive tab indexes first, lowest first, then the zeros", () => {
    const { root, b, c } = tabTree();
    const focus = new FocusManager();

    c.setTabIndex(1);
    b.setTabIndex(2);

    expect(walk(focus, root, 4)).toEqual(["c", "b", "a", "c"]);
  });

  it("skips hidden components and everything inside them", () => {
    const { root, a } = tabTree();
    const focus = new FocusManager();

    a.view().setVisible(false);

    expect(walk(focus, root, 2)).toEqual(["c", "c"]);
  });

  it("skips disabled components", () => {
    const { root, b } = tabTree();
    const focus = new FocusManager();

    b.view().setEnabled(false);

    expect(walk(focus, root, 3)).toEqual(["a", "c", "a"]);
  });

  it("returns null and keeps focus when nothing is tabbable", () => {
    const root = named("root", -1);
    root.addChildren(named("x", -1));
    const focus = new FocusManager();

    expect(focus.focusNext(root)).toBeNull();
    expect(focus.active()).toBeNull();
  });
});
