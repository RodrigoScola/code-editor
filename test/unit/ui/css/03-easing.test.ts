import { describe, expect, it } from "vitest";
import { easing } from "../../../../src/ui/styles/easing.js";

// Level 3: easing, how fast an animation moves along. easing(name) returns a
// function from time progress (0-1) to value progress (0-1), with CSS's
// names and curves. Transitions and animations use it; it's pure math.
//
//   linear, ease, ease-in, ease-out, ease-in-out
//   cubic-bezier(x1, y1, x2, y2)
//   steps(n)          jumps at the end of each step (CSS's jump-end)
//   steps(n, start)   jumps at the start of each step

describe("every curve starts at 0 and ends at 1", () => {
  it.each([
    "linear",
    "ease",
    "ease-in",
    "ease-out",
    "ease-in-out",
    "cubic-bezier(0.1, 0.7, 1, 0.1)",
    "steps(4)",
  ])("%s", (name) => {
    const f = easing(name);
    expect(f(0)).toBeCloseTo(0, 5);
    expect(f(1)).toBeCloseTo(1, 5);
  });
});

describe("linear", () => {
  it("is t itself", () => {
    expect(easing("linear")(0.25)).eq(0.25);
    expect(easing("linear")(0.8)).eq(0.8);
  });
});

// the values a browser computes for these curves
describe("the named cubic curves", () => {
  it("ease-in starts slow: 0.5 -> 0.315", () => {
    expect(easing("ease-in")(0.5)).toBeCloseTo(0.3153, 3);
  });

  it("ease-out ends slow: 0.5 -> 0.685", () => {
    expect(easing("ease-out")(0.5)).toBeCloseTo(0.6847, 3);
  });

  it("ease-in-out is symmetric: 0.5 -> 0.5", () => {
    expect(easing("ease-in-out")(0.5)).toBeCloseTo(0.5, 3);
  });

  it("ease (the CSS default): 0.5 -> 0.802", () => {
    expect(easing("ease")(0.5)).toBeCloseTo(0.8024, 3);
  });

  it("ease-in-out: 0.25 -> 0.129", () => {
    expect(easing("ease-in-out")(0.25)).toBeCloseTo(0.1291, 3);
  });

  it("keeps rising: ease-in never goes back", () => {
    const f = easing("ease-in");
    let last = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(f(t)).toBeGreaterThanOrEqual(last);
      last = f(t);
    }
  });
});

describe("cubic-bezier()", () => {
  it("cubic-bezier(0.42, 0, 1, 1) is ease-in", () => {
    expect(easing("cubic-bezier(0.42, 0, 1, 1)")(0.5)).toBeCloseTo(
      easing("ease-in")(0.5),
      5,
    );
  });

  it("cubic-bezier(0, 0, 1, 1) is linear", () => {
    expect(easing("cubic-bezier(0, 0, 1, 1)")(0.3)).toBeCloseTo(0.3, 3);
  });

  it("y can go past 1 (overshoot)", () => {
    const f = easing("cubic-bezier(0.3, 1.5, 0.7, 1.5)");
    expect(Math.max(f(0.6), f(0.7), f(0.8))).toBeGreaterThan(1);
  });
});

describe("steps()", () => {
  it("steps(4) holds each value until the step ends", () => {
    const f = easing("steps(4)");
    expect(f(0.1)).eq(0);
    expect(f(0.3)).eq(0.25);
    expect(f(0.5)).eq(0.5);
    expect(f(0.99)).eq(0.75);
  });

  it("steps(4, start) jumps as each step starts", () => {
    const f = easing("steps(4, start)");
    expect(f(0.1)).eq(0.25);
    expect(f(0.3)).eq(0.5);
    expect(f(0.99)).eq(1);
  });

  it("steps(1) is all or nothing", () => {
    expect(easing("steps(1)")(0.99)).eq(0);
  });
});

describe("unknown names", () => {
  it("throw, naming the curve", () => {
    expect(() => easing("bouncy")).toThrow(/bouncy/);
  });

  it("steps(0) throws", () => {
    expect(() => easing("steps(0)")).toThrow();
  });
});
