# Transparency specs (parked)

See-through colors in the cell canvas, the terminal renderer and the window
renderer. **Parked for later**: every file wraps its specs in `later()`, which
skips them. To start, change one line in [helpers.ts](helpers.ts):

```ts
export const later = describe;   // was describe.skip
```

Then go level by level, easiest first:

| Level | File | What it needs |
|---|---|---|
| 1 | [01-canvas-backgrounds](01-canvas-backgrounds.test.ts) | The canvas blends see-through backgrounds with each cell, right away. A see-through layer keeps the character under it and tints it. |
| 2 | [02-canvas-text](02-canvas-text.test.ts) | See-through text colors blend with their cell's background. |
| 3 | [03-terminal](03-terminal.test.ts) | The terminal only gets opaque 24-bit colors. What's left see-through is blended with an assumed background (`setAssumedBackground`, `#1e1e1e` by default). |
| 4 | [04-window](04-window.test.ts) | The window paints the same colors; see-through over its own background blends with `#1e1e1e`. |
| 5 | [05-both-renderers](05-both-renderers.test.ts) | A dialog over a dimmed screen, through layout, the same in both renderers. |

## Before these

- Color math: `blendColors` in `test/unit/ui/css/02-color.test.ts`
- Hex colors in the terminal: `test/unit/ui/styles/terminal-color.test.ts`
- Levels 4-5: the window renderer, `test/ide/window` (levels 1-6)
- Level 5 uses absolute positioning (`test/unit/ui/display/position-modes`)

`test/unit/ui/css/07-opacity.test.ts` covers the same idea from the
component side (`rgba()` backgrounds, `setOpacity()`); these cover the canvas
underneath and both renderers.

## The one rule that decides most of this

A terminal cell holds one opaque color, so blending happens on the canvas,
as each layer is painted. The only thing the canvas can't blend with is the
terminal's or window's own background, which it never sees. Those cells keep
their alpha (`"#rrggbbaa"`), and each renderer finishes the blend with the
background it has: the window knows its own, the terminal assumes one.
