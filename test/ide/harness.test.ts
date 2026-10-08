import { describe, expect, it } from "vitest";
import { parseCursor, parseKeys, vim } from "./harness.js";

// The harness has to work against today's editor, so these all pass. If one
// of these breaks, the feature specs around it can't be trusted either.

describe("harness", () => {
  it("places the cursor from the | marker", () => {
    expect(parseCursor("ab\nc|d")).toEqual({ content: "ab\ncd", line: 1, column: 1 });
  });

  it("parses Vim key notation", () => {
    expect(parseKeys("a<Esc><C-r>G").map((k) => [k.token, k.ctrl, k.shift])).toEqual([
      ["a", false, false],
      ["<Esc>", false, false],
      ["r", true, false],
      ["G", false, true],
    ]);
  });

  it("drives existing motions", () => {
    const ide = vim("foo |bar baz\nqux");

    ide.keys("w");
    expect(ide.text()).eq("foo bar |baz\nqux");

    ide.keys("j");
    expect(ide.cursor().line).eq(1);
  });

  it("drives insert mode", () => {
    const ide = vim("|world");

    ide.keys("ihello <Esc>");

    expect(ide.lines()).toEqual(["hello world"]);
    expect(ide.mode()).eq("normal");
  });

  it("drives dd", () => {
    const ide = vim("one\n|two\nthree");

    ide.keys("dd");

    expect(ide.lines()).toEqual(["one", "three"]);
  });

  it("drives the command line", () => {
    const ide = vim("|hello");

    ide.keys(":");
    expect(ide.mode()).eq("command");

    ide.keys("abc<Esc>");
    expect(ide.mode()).eq("normal");
    expect(ide.lines()).toEqual(["hello"]);
  });

  it("renders a screen with a status line at the bottom", () => {
    const ide = vim("hello", { width: 30, height: 10 });

    const screen = ide.screen();

    expect(screen).length(10);
    expect(screen.join("\n")).toContain("hello");
    expect(ide.statusLine()).toMatch(/normal/i);
  });
});
