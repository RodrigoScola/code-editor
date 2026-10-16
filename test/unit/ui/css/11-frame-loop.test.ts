import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatusWindow } from "../../../../src/Editor/windows/StatusEditor.js";
import { vim } from "../../../ide/harness.js";

// Level 11: animations in the running editor. The frame loop (index.ts calls
// ctx.renderIfNeeded() every few ms, test/unit/editor/frame-loop.test.ts)
// only draws when something asked for a frame. A running animation or
// transition is something: every tick draws while one runs, and the loop goes
// quiet again once it ends, so an editor that sits still still costs nothing.
//
// The animated component here is the status line (a real editor from
// test/ide/harness.ts); frames are what the terminal would receive.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["performance", "Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

const later = (ms: number) => vi.advanceTimersByTime(ms);

function editor() {
  const ide = vim("|hello");
  const frames: string[] = [];
  (ide.renderer as any).setOutput((frame: string) => frames.push(frame));
  ide.renderIfNeeded();
  frames.length = 0;

  const status = ide.findWindow(StatusWindow)!.view() as any;
  return { ide, frames, status };
}

const BLACK_TO_WHITE = [
  { backgroundColor: "#000000" },
  { backgroundColor: "#ffffff" },
];

describe("a running animation keeps the frames coming", () => {
  it("starting one asks for a frame", () => {
    const { ide, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000 });

    expect(ide.renderIfNeeded()).eq(true);
  });

  it("every tick draws while it runs", () => {
    const { ide, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000 });

    for (let t = 0; t < 900; t += 100) {
      later(100);
      expect(ide.renderIfNeeded(), `at ${t + 100}ms`).eq(true);
    }
  });

  it("each frame has the color of its time", () => {
    const { ide, frames, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(500);
    ide.renderIfNeeded();

    expect(frames.at(-1)).toContain("\x1b[48;2;128;128;128m");
  });

  it("one last frame at the end, then quiet", () => {
    const { ide, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(1500);

    expect(ide.renderIfNeeded()).eq(true);
    expect(ide.renderIfNeeded()).eq(false);
    later(100);
    expect(ide.renderIfNeeded()).eq(false);
  });

  it("an endless one never goes quiet", () => {
    const { ide, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000, iterations: Infinity });

    later(60_000);
    expect(ide.renderIfNeeded()).eq(true);
    later(16);
    expect(ide.renderIfNeeded()).eq(true);
  });

  it("cancelling it: one frame to take it away, then quiet", () => {
    const { ide, status } = editor();
    const animation = status.animate(BLACK_TO_WHITE, {
      duration: 1000,
      iterations: Infinity,
    });
    later(100);
    ide.renderIfNeeded();
    animation.cancel();

    expect(ide.renderIfNeeded()).eq(true);
    expect(ide.renderIfNeeded()).eq(false);
  });

  it("pausing it: quiet while paused", () => {
    const { ide, status } = editor();
    const animation = status.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(100);
    ide.renderIfNeeded();
    animation.pause();
    ide.renderIfNeeded();

    later(100);
    expect(ide.renderIfNeeded()).eq(false);
  });

  it("only changed cells are sent: the document's text isn't sent again", () => {
    const { ide, frames, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000 });
    later(100);
    ide.renderIfNeeded();

    expect(frames.at(-1)).not.toContain("hello");
  });
});

describe("transitions in the frame loop", () => {
  it("a change with a transition keeps drawing until it lands", () => {
    const { ide, status } = editor();
    status.setTransition("backgroundColor", { duration: 300, easing: "linear" });
    status.setBackgroundColor("#ffffff");

    expect(ide.renderIfNeeded()).eq(true);
    later(100);
    expect(ide.renderIfNeeded()).eq(true);
    later(100);
    expect(ide.renderIfNeeded()).eq(true);
    later(200);
    expect(ide.renderIfNeeded()).eq(true);
    expect(ide.renderIfNeeded()).eq(false);
  });
});

describe("animations and the rest of the editor", () => {
  it("typing still works while something animates", () => {
    const { ide, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000, iterations: Infinity });
    later(100);
    ide.keys("iX<Esc>");

    expect(ide.lines()).toEqual(["Xhello"]);
  });

  it("an animation in a hidden component doesn't keep the loop busy", () => {
    const { ide, status } = editor();
    status.animate(BLACK_TO_WHITE, { duration: 1000, iterations: Infinity });
    status.setVisible(false);
    ide.renderIfNeeded();

    later(100);
    expect(ide.renderIfNeeded()).eq(false);
  });
});
