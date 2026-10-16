import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Animation } from "../../../../src/ui/animation/Animation.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { backgrounds, box, paint, screen } from "./helpers.js";

// Level 10: keyframe animations, like the browser's element.animate():
//
//   const animation = component.animate(keyframes, options)
//
//   keyframes  [{ backgroundColor: "#000" }, { backgroundColor: "#fff" }]
//              offsets spread evenly unless a keyframe has offset: 0-1.
//              Properties: backgroundColor, color, opacity, backgroundImage
//   options    { duration (ms), delay = 0, iterations = 1 (or Infinity),
//                direction = "normal" | "reverse" | "alternate",
//                easing = "linear", fill = "none" | "forwards" }
//
//   animation.playState   "running" | "paused" | "finished" | "idle"
//   animation.currentTime ms since it started (delay included)
//   animation.play() / pause() / cancel() / finish()
//
//   component.getAnimations()  the ones running or paused
//   component.animating()      something is running (here or inside)
//
// A frame paints each property at the animation's value at that time. When
// it finishes, fill "none" goes back to the component's own value, "forwards"
// keeps the last keyframe.
//
// Animated gradients: two gradients with the same number of stops animate
// stop by stop (colors and positions) and their angles turn; otherwise they
// can't be mixed and the image swaps halfway, like CSS.
//
// Time is faked, as in level 9.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["performance", "Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

const later = (ms: number) => vi.advanceTimersByTime(ms);

function scene(width = 1) {
  const { canvas, root } = screen(width, 1);
  root.setBackgroundColor("#000000");
  const target = box(width, 1) as any;
  target.setBackgroundColor("#0000ff");
  root.addChildren(target);
  const frame = () => paint(root, canvas);
  const bg = () => backgrounds(frame())[0];
  return { target, frame, bg };
}

const BLACK_TO_WHITE = [
  { backgroundColor: "#000000" },
  { backgroundColor: "#ffffff" },
];

describe("animate()", () => {
  it("returns an Animation", () => {
    const { target } = scene();
    expect(target.animate(BLACK_TO_WHITE, { duration: 1000 })).toBeInstanceOf(
      Animation,
    );
  });

  it("starts running", () => {
    const { target } = scene();
    const animation = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    expect(animation.playState).eq("running");
    expect(animation.currentTime).eq(0);
  });

  it("an unknown property throws, naming it", () => {
    const { target } = scene();
    expect(() => target.animate([{ wobble: 1 }, { wobble: 2 }], { duration: 1 })).toThrow(
      /wobble/,
    );
  });

  it("fewer than two keyframes throws", () => {
    const { target } = scene();
    expect(() => target.animate([{ backgroundColor: "#fff" }], { duration: 1 })).toThrow();
  });
});

describe("two keyframes", () => {
  it("at the start, the first keyframe", () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000 });
    expect(bg()).eq("#000000");
  });

  it("a quarter in, a quarter of the way", () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(250);
    expect(bg()).eq("#404040");
  });

  it("currentTime follows the clock", () => {
    const { target } = scene();
    const animation = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(250);
    expect(animation.currentTime).eq(250);
  });

  it("at the end it is finished, and the component's own color comes back", () => {
    const { target, bg } = scene();
    const animation = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(1000);
    expect(animation.playState).eq("finished");
    expect(bg()).eq("#0000ff");
  });

  it('fill "forwards" keeps the last keyframe', () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000, fill: "forwards" });
    later(5000);
    expect(bg()).eq("#ffffff");
  });

  it("the easing option shapes the timing", () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000, easing: "ease-in" });
    later(500);
    // ease-in(0.5) = 0.3153 -> 80.4
    expect(bg()).eq("#505050");
  });
});

describe("more keyframes", () => {
  it("evenly spread when no offsets are given", () => {
    const { target, bg } = scene();
    target.animate(
      [
        { backgroundColor: "#000000" },
        { backgroundColor: "#ffffff" },
        { backgroundColor: "#000000" },
      ],
      { duration: 1000 },
    );
    later(500);
    expect(bg()).eq("#ffffff");
    later(250);
    expect(bg()).eq("#808080");
  });

  it("at their offsets when given", () => {
    const { target, bg } = scene();
    target.animate(
      [
        { offset: 0, backgroundColor: "#000000" },
        { offset: 0.8, backgroundColor: "#ffffff" },
        { offset: 1, backgroundColor: "#ffffff" },
      ],
      { duration: 1000 },
    );
    later(400);
    expect(bg()).eq("#808080");
  });
});

describe("repeating and direction", () => {
  it("iterations: 2 plays it twice", () => {
    const { target, bg } = scene();
    const animation = target.animate(BLACK_TO_WHITE, { duration: 1000, iterations: 2 });
    later(1250);
    expect(bg()).eq("#404040");
    expect(animation.playState).eq("running");
    later(750);
    expect(animation.playState).eq("finished");
  });

  it("iterations: Infinity never finishes", () => {
    const { target, bg } = scene();
    const animation = target.animate(BLACK_TO_WHITE, {
      duration: 1000,
      iterations: Infinity,
    });
    later(100_250);
    expect(bg()).eq("#404040");
    expect(animation.playState).eq("running");
  });

  it('direction "reverse" plays it backwards', () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000, direction: "reverse" });
    later(250);
    expect(bg()).eq("#bfbfbf");
  });

  it('direction "alternate" goes back on every second iteration', () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, {
      duration: 1000,
      iterations: 2,
      direction: "alternate",
    });
    later(1250);
    expect(bg()).eq("#bfbfbf");
  });

  it("a delay waits, showing the component's own color meanwhile", () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000, delay: 500 });
    later(250);
    expect(bg()).eq("#0000ff");
    later(500);
    expect(bg()).eq("#404040");
  });
});

describe("controlling it", () => {
  it("pause() holds it where it is", () => {
    const { target, bg } = scene();
    const animation = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(250);
    animation.pause();
    later(500);
    expect(animation.playState).eq("paused");
    expect(bg()).eq("#404040");
  });

  it("play() goes on from there", () => {
    const { target, bg } = scene();
    const animation = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(250);
    animation.pause();
    later(500);
    animation.play();
    later(250);
    expect(bg()).eq("#808080");
  });

  it("cancel() stops it and takes its effect away", () => {
    const { target, bg } = scene();
    const animation = target.animate(BLACK_TO_WHITE, {
      duration: 1000,
      fill: "forwards",
    });
    later(250);
    animation.cancel();
    expect(animation.playState).eq("idle");
    expect(bg()).eq("#0000ff");
  });

  it("finish() jumps to the end", () => {
    const { target, bg } = scene();
    const animation = target.animate(BLACK_TO_WHITE, {
      duration: 1000,
      fill: "forwards",
    });
    animation.finish();
    expect(animation.playState).eq("finished");
    expect(bg()).eq("#ffffff");
  });

  it("getAnimations() has the running and paused ones", () => {
    const { target } = scene();
    const a = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    const b = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    b.pause();
    expect(target.getAnimations()).toEqual([a, b]);
  });

  it("getAnimations() drops finished and cancelled ones", () => {
    const { target } = scene();
    const a = target.animate(BLACK_TO_WHITE, { duration: 1000 });
    const b = target.animate(BLACK_TO_WHITE, { duration: 5000 });
    a.cancel();
    later(2000);
    expect(target.getAnimations()).toEqual([b]);
  });

  it("the later animation wins when two animate the same property", () => {
    const { target, bg } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000 });
    target.animate(
      [{ backgroundColor: "#ff0000" }, { backgroundColor: "#ff0000" }],
      { duration: 1000 },
    );
    later(250);
    expect(bg()).eq("#ff0000");
  });
});

describe("animating()", () => {
  it("is true while one runs", () => {
    const { target } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(500);
    expect(target.animating()).eq(true);
  });

  it("is false once it finished", () => {
    const { target } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(1000);
    expect(target.animating()).eq(false);
  });

  it("is false while paused: nothing changes, nothing to draw", () => {
    const { target } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000 }).pause();
    expect(target.animating()).eq(false);
  });

  it("is true during the delay, which ends with a change", () => {
    const { target } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000, delay: 500 });
    later(100);
    expect(target.animating()).eq(true);
  });
});

describe("other properties", () => {
  it("color", () => {
    const { target, frame } = scene();
    target.setContent("x").setColor("#000000");
    target.animate([{ color: "#000000" }, { color: "#ffffff" }], { duration: 1000 });
    later(250);
    expect(frame()[0][0].color).eq("#404040");
  });

  it("opacity", () => {
    const { target, bg } = scene();
    target.setBackgroundColor("#ffffff");
    target.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000 });
    later(500);
    expect(bg()).eq("#808080");
  });
});

describe("animated gradients", () => {
  it("stop colors animate", () => {
    const { target, frame } = scene(4);
    target.animate(
      [
        { backgroundImage: "linear-gradient(to right, #000000, #ffffff)" },
        { backgroundImage: "linear-gradient(to right, #ffffff, #000000)" },
      ],
      { duration: 1000 },
    );
    later(500);
    // every stop is halfway to gray
    expect(backgrounds(frame())).toEqual(["#808080", "#808080", "#808080", "#808080"]);
  });

  it("the angle turns", () => {
    const { target, frame } = scene(4);
    target.animate(
      [
        { backgroundImage: "linear-gradient(90deg, #000000, #ffffff)" },
        { backgroundImage: "linear-gradient(270deg, #000000, #ffffff)" },
      ],
      { duration: 1000 },
    );
    later(500);
    // 180deg on a one-row box: every cell is halfway down the gradient
    expect(backgrounds(frame())).toEqual(["#808080", "#808080", "#808080", "#808080"]);
  });

  it("stop positions animate: a bright band moving across", () => {
    const { target, frame } = scene(4);
    target.animate(
      [
        {
          backgroundImage:
            "linear-gradient(to right, #000000 0%, #ffffff 0%, #000000 25%)",
        },
        {
          backgroundImage:
            "linear-gradient(to right, #000000 75%, #ffffff 100%, #000000 100%)",
        },
      ],
      { duration: 1000, iterations: Infinity },
    );
    const brightest = () => {
      const cells = backgrounds(frame()) as string[];
      return cells.indexOf([...cells].sort().at(-1)!);
    };
    expect(brightest()).eq(0);
    later(999);
    expect(brightest()).eq(3);
  });

  it("gradients with different numbers of stops swap halfway", () => {
    const { target, frame } = scene(2);
    target.animate(
      [
        { backgroundImage: "linear-gradient(to right, #ff0000, #ff0000)" },
        { backgroundImage: "linear-gradient(to right, #0000ff, #0000ff, #0000ff)" },
      ],
      { duration: 1000 },
    );
    later(499);
    expect(backgrounds(frame())[0]).eq("#ff0000");
    later(1);
    expect(backgrounds(frame())[0]).eq("#0000ff");
  });
});

describe("it changes only what's painted", () => {
  it("backgroundColor() stays the component's own value", () => {
    const { target } = scene();
    target.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(500);
    expect(target.backgroundColor()).toMatch(/#0000ff|0;0;255/);
  });

  it("a component without animations is untouched", () => {
    const component = new DisplayComponent() as any;
    expect(component.getAnimations()).toEqual([]);
  });
});
