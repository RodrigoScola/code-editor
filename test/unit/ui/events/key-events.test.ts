import { describe, expect, it } from "vitest";
import { UiComponent } from "../../../../src/ui/components/UiComponent.js";
import { FocusManager } from "../../../../src/ui/windows/FocusManager.js";
import { key } from "../../../helpers/ui.js";

// Proposed API (DOM-like, on UiComponent):
//
//   component.addEventListener(type, listener)
//   component.removeEventListener(type, listener)
//   component.dispatchEvent({ type, ...payload })
//
// dispatchEvent starts at the component (the target) and bubbles up through
// parent(). Every listener gets the payload plus:
//
//   event.target          the component dispatchEvent was called on
//   event.currentTarget   the component whose listener is running
//   event.stopPropagation()
//
// FocusManager.dispatchKey(keyEvent) sends a "keydown" event, carrying the
// key as event.key, to the focused component.

function tree() {
  const root = new UiComponent().setName("root");
  const parent = new UiComponent().setName("parent");
  const child = new UiComponent().setName("child");
  const sibling = new UiComponent().setName("sibling");

  root.addChildren([parent, sibling]);
  parent.addChildren(child);

  return { root, parent, child, sibling };
}

describe("dispatching an event", () => {
  it("calls the target's own listener", () => {
    const { child } = tree();
    const seen: any[] = [];

    child.addEventListener("keydown", (event: any) => seen.push(event));
    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(seen).length(1);
    expect(seen[0].key.token).eq("a");
    expect(seen[0].target).eq(child);
    expect(seen[0].currentTarget).eq(child);
  });

  it("only calls listeners for the matching type", () => {
    const { child } = tree();
    let calls = 0;

    child.addEventListener("submit", () => calls++);
    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(calls).eq(0);
  });

  it("calls every listener on a component in the order they were added", () => {
    const { child } = tree();
    const order: string[] = [];

    child.addEventListener("keydown", () => order.push("first"));
    child.addEventListener("keydown", () => order.push("second"));
    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(order).toEqual(["first", "second"]);
  });

  it("stops calling a removed listener", () => {
    const { child } = tree();
    let calls = 0;
    const listener = () => calls++;

    child.addEventListener("keydown", listener);
    child.removeEventListener("keydown", listener);
    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(calls).eq(0);
  });
});

describe("bubbling", () => {
  it("goes from the target up to the root", () => {
    const { root, parent, child } = tree();
    const order: string[] = [];

    for (const component of [root, parent, child]) {
      component.addEventListener("keydown", (event: any) =>
        order.push(event.currentTarget.name()),
      );
    }

    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(order).toEqual(["child", "parent", "root"]);
  });

  it("keeps the original target while currentTarget moves up", () => {
    const { root, child } = tree();
    let seen: any = null;

    root.addEventListener("keydown", (event: any) => (seen = event));
    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(seen.target).eq(child);
    expect(seen.currentTarget).eq(root);
  });

  it("does not reach siblings or children of the target", () => {
    const { parent, sibling } = tree();
    let calls = 0;

    sibling.addEventListener("keydown", () => calls++);
    parent.children()[0].addEventListener("keydown", () => calls++);

    parent.dispatchEvent({ type: "keydown", key: key("a") });

    expect(calls).eq(0);
  });

  it("stopPropagation keeps the event from reaching ancestors", () => {
    const { root, parent, child } = tree();
    const order: string[] = [];

    parent.addEventListener("keydown", (event: any) => {
      order.push("parent");
      event.stopPropagation();
    });
    root.addEventListener("keydown", () => order.push("root"));

    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(order).toEqual(["parent"]);
  });

  it("stopPropagation still lets the other listeners on the same component run", () => {
    const { parent, child } = tree();
    const order: string[] = [];

    parent.addEventListener("keydown", (event: any) => {
      order.push("first");
      event.stopPropagation();
    });
    parent.addEventListener("keydown", () => order.push("second"));

    child.dispatchEvent({ type: "keydown", key: key("a") });

    expect(order).toEqual(["first", "second"]);
  });
});

describe("keys go to the focused component", () => {
  it("dispatches a keydown on the focused component and bubbles it", () => {
    const { root, child, sibling } = tree();
    const focus = new FocusManager();
    const order: string[] = [];

    child.addEventListener("keydown", () => order.push("child"));
    sibling.addEventListener("keydown", () => order.push("sibling"));
    root.addEventListener("keydown", (event: any) =>
      order.push(`root:${event.key.token}`),
    );

    focus.focus(child);
    focus.dispatchKey(key("x"));

    expect(order).toEqual(["child", "root:x"]);
  });

  it("does nothing when nothing is focused", () => {
    const focus = new FocusManager();

    expect(() => focus.dispatchKey(key("x"))).not.toThrow();
  });
});
