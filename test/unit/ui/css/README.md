# CSS specs: painting and motion

What the UI engine is missing next to CSS on the painting side: gradients,
see-through colors, opacity, shadows, outlines, visibility, text-transform,
transitions and animations. Layout (flex, gap, min-size, positioning),
the cascade, true color, text and events already have specs elsewhere in
`test/unit/ui/`; these don't repeat them.

The files are levels, easiest first. Each level needs the ones before it.

```sh
npx vitest run test/unit/ui/css/02        # one level
npx vitest test/unit/ui/css/04            # watch mode while building it
npx vitest run test/unit/ui/css           # all of them
```

| Level | File | What it needs |
|---|---|---|
| 1 | [01-interface](01-interface.test.ts) | Every module and method exists. The checklist. |
| 2 | [02-color](02-color.test.ts) | `parseColor`, `formatColor`, `mixColors`, `blendColors`. Pure functions. |
| 3 | [03-easing](03-easing.test.ts) | `easing(name)`: CSS's timing curves and `steps()`. Pure functions. |
| 4 | [04-gradient-math](04-gradient-math.test.ts) | `parseGradient`, `gradientColorAt`, `sampleGradient`. Pure functions. |
| 5 | [05-text-transform-visibility](05-text-transform-visibility.test.ts) | `text-transform` and `visibility: hidden`. No new math. |
| 6 | [06-gradients](06-gradients.test.ts) | `setBackgroundImage("linear-gradient(...)")` painted, cell by cell. |
| 7 | [07-opacity](07-opacity.test.ts) | `rgba()` / `#rrggbbaa` colors and `setOpacity()`, blended with what's under. |
| 8 | [08-outline-shadow](08-outline-shadow.test.ts) | `setOutline()` and `setBoxShadow()`: drawn outside the box, taking no space. |
| 9 | [09-transitions](09-transitions.test.ts) | `setTransition()`: a changed color moves there over time. |
| 10 | [10-animations](10-animations.test.ts) | `animate(keyframes, options)`, including animated gradients. |
| 11 | [11-frame-loop](11-frame-loop.test.ts) | A running animation keeps the editor's frame loop drawing, and only then. |

## Before you start

- **Levels 5-11 need hex colors in the terminal renderer** (`ESC[48;2;r;g;bm`),
  which `test/unit/ui/styles/truecolor.test.ts` describes. Until then the
  specs stop with a message saying so.
- **Level 11 uses `test/ide/harness.ts`**, which still imports
  `src/ui/renderer.js` from before the `TerminalRenderer` rename.

## How the specs read colors

[helpers.ts](helpers.ts) paints with the real `TerminalRenderer` and reads
each cell back from the escape codes it sends: `"#rrggbb"` for a 24-bit
color, the code itself for an ANSI palette color, `null` for the default. So
the specs don't care how a style stores its colors, only what reaches the
terminal (and so the window renderer).

ANSI palette colors can't be blended or mixed: the terminal's theme decides
what they look like. Gradients, alpha and opacity work with CSS colors.

## Time

Transitions and animations read `performance.now()`. The specs fake it
(`vi.useFakeTimers({ toFake: ["performance", "Date"] })`) and step it with
`vi.advanceTimersByTime(ms)`. A frame paints every value at the time it is
painted, so nothing needs a timer of its own, and the frame loop just has to
know that something is `animating()`.

## Missing, not specced here

- `display: grid`
- `transform` (translate / scale / rotate)
- `background-position` / `background-size`
- `text-shadow`, `filter`
- `::before` / `::after` content
- `z-index` beyond the `setIndex()` that exists
- hover / active styles (mouse input is yours to design)
- `letter-spacing` / `line-height` / `vertical-align`, which mean little in a
  grid of cells
