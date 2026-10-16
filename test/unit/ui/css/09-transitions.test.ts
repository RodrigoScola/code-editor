import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { backgrounds, box, paint, screen } from "./helpers.js";

// Level 9: time. CSS transitions: when a property changes, the painted value
// moves from the old value to the new one over a duration instead of
// jumping.
//
//   setTransition(property, { duration, easing?, delay? })   ms, easing names
//                                                            from level 3
//   setTransition(property, null)                            removes it
//   transition(property)            the options, or null
//
// Properties: "backgroundColor", "color", "opacity".
//
// Time is performance.now(): the specs fake it (vi.useFakeTimers) and move
// it with vi.advanceTimersByTime(ms). A frame paints the values at the time
// it is painted, so nothing needs a timer of its own.
//
// Scene: a 2-cell box on a black root, painted at each step.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["performance", "Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

function scene(setup: (target: any) => void) {
  const { canvas, root } = screen(2, 1);
  root.setBackgroundColor("#000000");
  const target = box(2, 1, "ab") as any;
  target.setBackgroundColor("#000000").setColor("#000000");
  setup(target);
  root.addChildren(target);
  const frame = () => paint(root, canvas);
  frame();
  return { target, frame };
}

const later = (ms: number) => vi.advanceTimersByTime(ms);

describe("transition()", () => {
  it("is null when there is none", () => {
    expect((new DisplayComponent() as any).transition("backgroundColor")).toBeNull();
  });

  it("is the options that were set", () => {
    const component = new DisplayComponent() as any;
    component.setTransition("color", { duration: 300, easing: "ease-in" });
    expect(component.transition("color")).toMatchObject({
      duration: 300,
      easing: "ease-in",
    });
  });

  it("removing it", () => {
    const component = new DisplayComponent() as any;
    component.setTransition("color", { duration: 300 });
    component.setTransition("color", null);
    expect(component.transition("color")).toBeNull();
  });

  it("an unknown property throws, naming it", () => {
    const component = new DisplayComponent() as any;
    expect(() => component.setTransition("wobble", { duration: 1 })).toThrow(
      /wobble/,
    );
  });
});

describe("a background-color transition", () => {
  it("without one, a change shows at once", () => {
    const { target, frame } = scene(() => {});
    target.setBackgroundColor("#ffffff");
    expect(backgrounds(frame())[0]).eq("#ffffff");
  });

  it("right after the change, the old color still shows", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000, easing: "linear" }),
    );
    target.setBackgroundColor("#ffffff");
    expect(backgrounds(frame())[0]).eq("#000000");
  });

  it("halfway through, halfway between", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000, easing: "linear" }),
    );
    target.setBackgroundColor("#ffffff");
    later(500);
    expect(backgrounds(frame())[0]).eq("#808080");
  });

  it("at the end, the new color, and it stays", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000, easing: "linear" }),
    );
    target.setBackgroundColor("#ffffff");
    later(1000);
    expect(backgrounds(frame())[0]).eq("#ffffff");
    later(5000);
    expect(backgrounds(frame())[0]).eq("#ffffff");
  });

  it("backgroundColor() is the new value at once; only the painting moves", () => {
    const { target } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000 }),
    );
    target.setBackgroundColor("#ffffff");
    expect(target.backgroundColor()).toMatch(/#ffffff|255;255;255/);
  });

  it("the default easing is ease, like CSS", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000 }),
    );
    target.setBackgroundColor("#ffffff");
    later(500);
    // ease(0.5) = 0.8024 -> 204.6
    expect(backgrounds(frame())[0]).eq("#cdcdcd");
  });

  it("steps() easing jumps", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000, easing: "steps(2)" }),
    );
    target.setBackgroundColor("#ffffff");
    later(400);
    expect(backgrounds(frame())[0]).eq("#000000");
    later(200);
    expect(backgrounds(frame())[0]).eq("#808080");
  });

  it("a delay waits before it starts moving", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", {
        duration: 1000,
        delay: 500,
        easing: "linear",
      }),
    );
    target.setBackgroundColor("#ffffff");
    later(400);
    expect(backgrounds(frame())[0]).eq("#000000");
    later(600);
    expect(backgrounds(frame())[0]).eq("#808080");
  });

  it("changing again halfway starts from where it is now", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000, easing: "linear" }),
    );
    target.setBackgroundColor("#ffffff");
    later(500);
    frame(); // #808080
    target.setBackgroundColor("#000000");
    later(500);
    expect(backgrounds(frame())[0]).eq("#404040");
  });

  it("setting the same color again doesn't restart it", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000, easing: "linear" }),
    );
    target.setBackgroundColor("#ffffff");
    later(500);
    target.setBackgroundColor("#ffffff");
    later(250);
    expect(backgrounds(frame())[0]).eq("#bfbfbf");
  });
});

describe("other properties", () => {
  it("color (the text)", () => {
    const { target, frame } = scene((t) =>
      t.setTransition("color", { duration: 1000, easing: "linear" }),
    );
    target.setColor("#ffffff");
    later(250);
    expect(frame()[0][0].color).eq("#404040");
  });

  it("opacity", () => {
    const { target, frame } = scene((t) => {
      t.setBackgroundColor("#ffffff");
      t.setTransition("opacity", { duration: 1000, easing: "linear" });
    });
    target.setOpacity(0);
    later(500);
    expect(backgrounds(frame())[0]).eq("#808080");
  });

  it("each property moves on its own", () => {
    const { target, frame } = scene((t) => {
      t.setTransition("backgroundColor", { duration: 1000, easing: "linear" });
      t.setTransition("color", { duration: 500, easing: "linear" });
    });
    target.setBackgroundColor("#ffffff").setColor("#ffffff");
    later(500);
    const cell = frame()[0][0];
    expect(cell.background).eq("#808080");
    expect(cell.color).eq("#ffffff");
  });
});

describe("animating()", () => {
  it("is true while a transition is moving", () => {
    const { target } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000 }),
    );
    target.setBackgroundColor("#ffffff");
    later(500);
    expect(target.animating()).eq(true);
  });

  it("is false once it has ended", () => {
    const { target } = scene((t) =>
      t.setTransition("backgroundColor", { duration: 1000 }),
    );
    target.setBackgroundColor("#ffffff");
    later(1000);
    expect(target.animating()).eq(false);
  });

  it("is false with nothing moving", () => {
    expect((new DisplayComponent() as any).animating()).eq(false);
  });

  it("is true on an ancestor while something inside it moves", () => {
    const parent = new DisplayComponent() as any;
    const child = new DisplayComponent() as any;
    parent.addChildren(child);
    child.setTransition("backgroundColor", { duration: 1000 });
    child.setBackgroundColor("#ffffff");

    expect(parent.animating()).eq(true);
  });
});
