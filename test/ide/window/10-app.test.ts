import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { cellCanvas, paint, style } from "./helpers.js";
import colors from "../../../src/ui/colors.js";

// Level 10: the real thing. A real SDL window (it flashes on screen for a
// moment), then the built editor started the way `npm run dev:window` starts
// it. Slower than the other levels; run it last.
//
//   WindowRenderer.Open(canvas)   a WindowRenderer on a new SDL window,
//                                 sized to fit the canvas's cells, resizable
//   node dist/index.js --window   the editor in its own window: no terminal
//                                 output at all, the window is the screen,
//                                 window keys are the input, closing the
//                                 window quits (exit code 0)
//
// The app specs run dist/, so build first: npm run build

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("WindowRenderer.Open: a real window", () => {
  it("opens a window that fits the canvas's cells", () => {
    const renderer = WindowRenderer.Open(cellCanvas(20, 5));
    try {
      expect(renderer.gridSize()).toEqual({ columns: 20, rows: 5 });
    } finally {
      renderer.close();
    }
  });

  it("is a window renderer", () => {
    const renderer = WindowRenderer.Open(cellCanvas(4, 2));
    try {
      expect(renderer.isWindowRenderer()).eq(true);
    } finally {
      renderer.close();
    }
  });

  it("draws to it", () => {
    const canvas = cellCanvas(10, 3);
    paint(
      canvas,
      0,
      0,
      "hello",
      style()
        .setBackgroundColor(colors.BLUE_BACKGROUND)
        .setColor(colors.WHITE_FOREGROUND),
    );
    const renderer = WindowRenderer.Open(canvas);
    try {
      expect(() => renderer.render()).not.toThrow();
    } finally {
      renderer.close();
    }
  });

  it("render() after close() does nothing and doesn't throw", () => {
    const renderer = WindowRenderer.Open(cellCanvas(4, 2));
    renderer.close();

    expect(() => renderer.render()).not.toThrow();
  });
});

describe("the npm scripts", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  it("npm run dev:window is the hot reload with --window", () => {
    expect(pkg.scripts["dev:window"]).eq("node scripts/dev.mjs --window");
  });

  it("npm run start:window runs the build with --window", () => {
    expect(pkg.scripts["start:window"]).eq("node dist/index.js --window");
  });

  it("scripts/dev.mjs passes its arguments on to the editor", () => {
    const dev = readFileSync(join(root, "scripts", "dev.mjs"), "utf8");
    expect(dev).toContain("process.argv.slice(2)");
  });
});

describe("node dist/index.js --window", () => {
  const entry = join(root, "dist", "index.js");

  it("dist/ is built from the current source (npm run build)", () => {
    expect(existsSync(entry), "dist/index.js is missing: npm run build").eq(true);
    expect(
      statSync(entry).mtimeMs,
      "dist/index.js is older than src/index.ts: npm run build",
    ).toBeGreaterThanOrEqual(statSync(join(root, "src", "index.ts")).mtimeMs);
  });

  // starts the editor, lets it run, then stops it. Returns what it printed
  // and whether it was still running when stopped
  function run(args: string[], ms: number) {
    return new Promise<{ output: string; running: boolean; code: number | null }>(
      (resolve) => {
        const child = spawn(process.execPath, [entry, ...args], {
          cwd: root,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        child.stdout.on("data", (d) => (output += d));
        child.stderr.on("data", (d) => (output += d));

        let running = true;
        child.on("exit", (code) => {
          running = false;
          resolve({ output, running: false, code });
        });
        setTimeout(() => {
          if (running) {
            child.removeAllListeners("exit");
            child.kill();
            resolve({ output, running: true, code: null });
          }
        }, ms);
      },
    );
  }

  it(
    "keeps running, and writes nothing to the terminal",
    async () => {
      const result = await run(["--window"], 3000);

      expect(result.running, `it exited (${result.code}):\n${result.output}`).eq(true);
      expect(JSON.stringify(result.output)).eq('""');
    },
    20_000,
  );
});
