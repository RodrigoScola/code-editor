# Window specs

The editor in a native window instead of the terminal (`npm run dev:window`),
built test-first. The files are levels, easiest first: make 01 pass, then
02, and so on. Each level only needs the ones before it, and the last one is
the real app.

```sh
npx vitest run test/ide/window/01        # one level
npx vitest test/ide/window/03            # watch mode while building it
npx vitest run test/ide/window           # all of them
npm run build                            # before level 10, it runs dist/
```

| Level | File | What it needs |
|---|---|---|
| 1 | [01-interface](01-interface.test.ts) | Every file and method exists. The checklist. |
| 2 | [02-colors](02-colors.test.ts) | `ansiToCss(code)`: ANSI color codes to `"#rrggbb"`. A pure function. |
| 3 | [03-keys](03-keys.test.ts) | `WindowInputParser.parse(event)`: SDL key events to `KeyEvent`s. A pure function. |
| 4 | [04-modes](04-modes.test.ts) | Normal, insert and command mode driven by window events. Nothing new if 3 passes. |
| 5 | [05-grid](05-grid.test.ts) | `WindowRenderer`: cell size, `gridSize()`, `layout()`/`setLayout()`. No drawing. |
| 6 | [06-painting](06-painting.test.ts) | `render()`: cells to pixels with Canvas 2D, checked pixel by pixel. |
| 7 | [07-text-frame](07-text-frame.test.ts) | `build(root)` and `frame()`: the rest of the `Renderer` interface. |
| 8 | [08-window-events](08-window-events.test.ts) | `onInput`, `onResize`, `onClose`, `close()`. |
| 9 | [09-connect](09-connect.test.ts) | `setupEditor.window.connect(editor, renderer)`: the editor in a (fake) window, in-process. |
| 10 | [10-app](10-app.test.ts) | `WindowRenderer.Open` (a real SDL window) and `node dist/index.js --window`. |

## What gets built

```
src/Input/windowInput.ts
  type WindowKeyDown    = { type: "keyDown"; key: string | null;
                            shift; ctrl; alt; repeat: boolean }
  type WindowTextInput  = { type: "textInput"; text: string }
  type WindowInputEvent = WindowKeyDown | WindowTextInput
  WindowInputParser.parse(event): KeyEvent[]

src/ui/Renderers/ansiColors.ts
  ansiToCss(code): string | null      "#rrggbb", null = default color
  DEFAULT_BACKGROUND, DEFAULT_FOREGROUND, BASIC_COLORS

src/ui/Renderers/WindowRenderer.ts
  new WindowRenderer(canvas, window)  window: a PixelWindow (SDL-shaped)
  WindowRenderer.Open(canvas)         on a new SDL window
  Renderer:  build(root) render() setLayout(l) layout() frame()
             isTerminalRenderer() isWindowRenderer()
  window:    canvas() cellWidth() cellHeight() gridSize()
             onInput(f) onResize(f) onClose(f) close()

src/Editor/setupEditor.ts
  setupEditor.window.connect(editor, renderer)

src/index.ts
  --window: the editor in WindowRenderer.Open(...), nothing on the terminal
```

The specs never open a real window before level 10. They hand the renderer a
`FakeWindow` ([helpers.ts](helpers.ts)) that records every frame instead of
showing it, and sends events shaped like SDL's (modifiers as numbers, extra
fields). So `PixelWindow` only needs what the fake has: `pixelWidth`,
`pixelHeight`, `destroyed`, `render(...)`, `on(event, listener)` and
`destroy()`.

## The key rule (level 3)

A key that types a character sends `keyDown` **and then** `textInput`.
Characters come from `textInput` only, and `keyDown` of a typing key is `[]`,
or every letter would be typed twice. Escape, Enter, arrows and Ctrl/Alt
combinations only send `keyDown`, so those come from `keyDown`.

## Docs

- SDL for Node: `node_modules/@kmamal/sdl/README.md` (window events, `render()`,
  virtual key names)
- Canvas 2D: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
  (`@napi-rs/canvas` follows it)
