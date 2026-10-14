import cp from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { FileTreeWindow } from "../../../src/Editor/windows/FileTree/FileTreeWindow.js";
import { stripAnsi, vim, workspace } from "../../ide/harness.js";

// The editor draws the way a browser does with requestAnimationFrame:
// index.ts calls ctx.renderIfNeeded() on a short interval, and a frame is
// only drawn when something asked for one (ctx.requestRepaint(), a key) or
// the layout changed (a buffer edit, a log line). Each frame sends the
// terminal only the cells that changed (test/unit/ui/rendering/
// diff-render.test.ts), so an editor that sits still costs nothing.

function editor(text = "hello\nworld", width = 40, height = 10) {
  const ctx = vim(text, { width, height });
  const frames: string[] = [];
  ctx.renderer.setOutput((frame) => frames.push(frame));
  return { ctx, frames };
}

// child_process.execFile answering like `git status --porcelain -z`
function fakeGit(status: string) {
  return ((...args: unknown[]) => {
    const callback = args.at(-1) as (
      err: Error | null,
      stdout: string,
      stderr: string,
    ) => void;
    callback(null, status, "");
    return {};
  }) as never;
}

describe("frame loop", () => {
  it("draws the first frame", () => {
    const { ctx, frames } = editor();

    expect(ctx.renderIfNeeded()).eq(true);
    expect(stripAnsi(frames[0])).toContain("hello");
  });

  it("draws nothing when nothing changed", () => {
    const { ctx, frames } = editor();

    ctx.renderIfNeeded();

    expect(ctx.renderIfNeeded()).eq(false);
    expect(frames).length(1);
  });

  it("draws one frame however many times one was asked for", () => {
    const { ctx, frames } = editor();
    ctx.renderIfNeeded();

    ctx.requestRepaint();
    ctx.requestRepaint();
    ctx.requestRepaint();

    expect(ctx.renderIfNeeded()).eq(true);
    expect(ctx.renderIfNeeded()).eq(false);
    expect(frames).length(2);
  });

  it("a key asks for a frame", () => {
    const { ctx } = editor();
    ctx.renderIfNeeded();

    // moving the cursor changes no layout, the key itself has to ask
    ctx.keys("l");

    expect(ctx.renderIfNeeded()).eq(true);
  });

  it("an edit outside of a key draws a frame without being asked", () => {
    const { ctx, frames } = editor();
    ctx.renderIfNeeded();

    // like a log line arriving in a log window
    ctx.window().buffer().append("more");

    expect(ctx.renderIfNeeded()).eq(true);
    expect(stripAnsi(frames[1])).toContain("more");
  });

  it("a frame that changed nothing does not resend the screen", () => {
    const { ctx, frames } = editor();
    ctx.renderIfNeeded();

    ctx.requestRepaint();
    ctx.renderIfNeeded();

    expect(stripAnsi(frames[1])).not.toContain("hello");
    expect(stripAnsi(frames[1])).not.toContain("world");
  });

  it("typing sends the line that changed, not the whole screen", () => {
    const { ctx, frames } = editor();
    ctx.renderIfNeeded();

    ctx.keys("iX<Esc>");
    ctx.renderIfNeeded();

    expect(stripAnsi(frames[1])).toContain("X");
    expect(stripAnsi(frames[1])).not.toContain("world");
  });

  it("an open file tree does not ask for frames on its own", () => {
    const { ctx } = editor();
    const root = workspace({ "a.txt": "a", "src/b.ts": "b" });
    ctx.addSidebar(new FileTreeWindow(root));

    ctx.renderIfNeeded();

    expect(ctx.renderIfNeeded()).eq(false);
  });
});

describe("the status line and git", () => {
  // running git takes tens of milliseconds, painting a frame must not wait
  // for it, and it must not run once per frame
  it("drawing frames never waits for git", () => {
    const execSync = vi.spyOn(cp, "execSync");
    const execFile = vi.spyOn(cp, "execFile").mockImplementation(fakeGit(""));
    const { ctx } = editor();
    ctx.setWorkspace(workspace({ "a.txt": "a" }));

    for (let i = 0; i < 10; i++) {
      ctx.requestRepaint();
      ctx.renderIfNeeded();
    }

    expect(execSync).not.toHaveBeenCalled();
    expect(execFile.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("shows the branch once git answers", async () => {
    vi.spyOn(cp, "execFile").mockImplementation(fakeGit("## main\0"));
    const { ctx } = editor("hello", 120, 10);
    ctx.setWorkspace(workspace({ "a.txt": "a" }));

    ctx.statusLine();

    await vi.waitFor(() => expect(ctx.statusLine()).toContain("main"));
  });

  it("asks for a frame when git answers", async () => {
    vi.spyOn(cp, "execFile").mockImplementation(fakeGit("## main\0"));
    const { ctx } = editor("hello", 120, 10);
    ctx.setWorkspace(workspace({ "a.txt": "a" }));
    ctx.renderIfNeeded();

    // the answer comes back after the frame that asked for it
    await vi.waitFor(() => expect(ctx.renderIfNeeded()).eq(true));
  });

  it("shows no branch outside of a git repository", async () => {
    vi.spyOn(cp, "execFile").mockImplementation(((...args: unknown[]) => {
      const callback = args.at(-1) as (err: Error | null) => void;
      callback(new Error("fatal: not a git repository"));
      return {};
    }) as never);
    const { ctx } = editor("hello", 120, 10);
    ctx.setWorkspace(workspace({ "a.txt": "a" }));

    ctx.statusLine();
    await Promise.resolve();

    expect(ctx.statusLine()).not.toContain("branch");
  });
});
