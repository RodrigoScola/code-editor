import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";

// Level 1: the pieces exist. The checklist for the whole folder: new
// modules for the math (pure functions, no components), and new style
// properties on components. Nothing has to work yet.
//
//   src/ui/styles/color.ts       parseColor, formatColor, mixColors, blendColors
//   src/ui/styles/easing.ts      easing(name) -> (t) => progress
//   src/ui/styles/gradient.ts    parseGradient, gradientColorAt, sampleGradient
//   src/ui/animation/Animation.ts  the Animation that component.animate() returns
//
// On components (DisplayComponent, like the existing style setters):
//   background-image  setBackgroundImage(css) / backgroundImage()
//   opacity           setOpacity(n) / opacity()
//   box-shadow        setBoxShadow(css) / boxShadow()
//   outline           setOutline(style) / outline(), setOutlineColor(color)
//   visibility        setVisibility(v) / visibility()
//   text-transform    setTextTransform(t) / textTransform()
//   transition        setTransition(property, options) / transition(property)
//   animations        animate(keyframes, options), getAnimations(), animating()
//
// Where the code lives is up to you; the specs only use these names. The
// math modules are imported dynamically here, so a missing file fails its
// own spec with a hint.

async function load(path: string, hint: string): Promise<any> {
  try {
    return await import(path);
  } catch (err) {
    throw new Error(`${hint}\n(${path}: ${(err as Error).message})`);
  }
}

describe("src/ui/styles/color.ts", () => {
  it.each(["parseColor", "formatColor", "mixColors", "blendColors"])(
    "exports %s()",
    async (name) => {
      const module = await load(
        "../../../../src/ui/styles/color.js",
        "create src/ui/styles/color.ts",
      );
      expect(typeof module[name]).eq("function");
    },
  );
});

describe("src/ui/styles/easing.ts", () => {
  it("exports easing(name), which returns a function of t", async () => {
    const { easing } = await load(
      "../../../../src/ui/styles/easing.js",
      "create src/ui/styles/easing.ts",
    );
    expect(typeof easing).eq("function");
    expect(typeof easing("linear")).eq("function");
  });
});

describe("src/ui/styles/gradient.ts", () => {
  it.each(["parseGradient", "gradientColorAt", "sampleGradient"])(
    "exports %s()",
    async (name) => {
      const module = await load(
        "../../../../src/ui/styles/gradient.js",
        "create src/ui/styles/gradient.ts",
      );
      expect(typeof module[name]).eq("function");
    },
  );
});

describe("src/ui/animation/Animation.ts", () => {
  it("exports the Animation class", async () => {
    const { Animation } = await load(
      "../../../../src/ui/animation/Animation.js",
      "create src/ui/animation/Animation.ts",
    );
    expect(typeof Animation).eq("function");
  });

  it.each(["play", "pause", "cancel", "finish"])(
    "an Animation can %s()",
    async (method) => {
      const { Animation } = await load(
        "../../../../src/ui/animation/Animation.js",
        "create src/ui/animation/Animation.ts",
      );
      expect(typeof Animation.prototype[method]).eq("function");
    },
  );
});

describe("components have the new style properties", () => {
  it.each([
    "setBackgroundImage",
    "backgroundImage",
    "setOpacity",
    "opacity",
    "setBoxShadow",
    "boxShadow",
    "setOutline",
    "outline",
    "setOutlineColor",
    "setVisibility",
    "visibility",
    "setTextTransform",
    "textTransform",
    "setTransition",
    "transition",
    "animate",
    "getAnimations",
    "animating",
  ])("%s()", (method) => {
    const component = new DisplayComponent() as any;
    expect(typeof component[method]).eq("function");
  });

  it.each([
    ["setBackgroundImage", "none"],
    ["setOpacity", 1],
    ["setBoxShadow", "none"],
    ["setOutline", "none"],
    ["setOutlineColor", "#ff0000"],
    ["setVisibility", "visible"],
    ["setTextTransform", "none"],
  ])("%s() returns the component, so setters chain", (method, value) => {
    const component = new DisplayComponent() as any;
    expect(component[method](value)).toBe(component);
  });

  it("setTransition() returns the component", () => {
    const component = new DisplayComponent() as any;
    expect(
      component.setTransition("backgroundColor", { duration: 100 }),
    ).toBe(component);
  });
});
