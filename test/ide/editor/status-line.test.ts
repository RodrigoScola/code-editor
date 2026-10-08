import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// The bottom row, like Vim's statusline / lualine or VS Code's status bar:
//   mode (NORMAL / INSERT / VISUAL), file name, [+] when modified,
//   line:column (from 1), file type, and keys typed so far for a command.
// Git branch and diagnostics counts are in the git / diagnostics specs; the
// "recording @a" indicator is in the macros spec.

const wide = { width: 100, height: 10 };

describe("status line", () => {
  it("shows the mode", () => {
    const ide = vim("|abc", wide);

    expect(ide.statusLine()).toContain("NORMAL");
    expect(ide.keys("i").statusLine()).toContain("INSERT");
    expect(ide.keys("<Esc>v").statusLine()).toContain("VISUAL");
  });

  it("shows the file name", () => {
    const ide = vim("abc", { ...wide, path: "src/main.ts" });

    expect(ide.statusLine()).toContain("main.ts");
  });

  it("shows [+] once the file is modified", () => {
    const ide = vim("|abc", wide);
    expect(ide.statusLine()).not.toContain("[+]");

    ide.keys("iX<Esc>");

    expect(ide.statusLine()).toContain("[+]");
  });

  it("drops [+] after saving", () => {
    const ide = vim("|abc", wide).keys("iX<Esc>:w<CR>");

    expect(ide.statusLine()).not.toContain("[+]");
  });

  it("shows the cursor position as line:column counting from 1", () => {
    expect(vim("a\nb\nab|cde", wide).statusLine()).toContain("3:3");
  });

  it("updates the position when the cursor moves", () => {
    const ide = vim("|abc\ndef", wide).keys("jl");

    expect(ide.statusLine()).toContain("2:2");
  });

  it("shows the file type", () => {
    const ide = vim("abc", { ...wide, path: "a.ts" });

    expect(ide.statusLine()).toContain("typescript");
  });

  it("shows the keys of a command that is not finished yet", () => {
    const ide = vim("|abc", wide).keys("2d");

    expect(ide.statusLine()).toContain("2d");
  });

  it("does not show memory usage", () => {
    expect(vim("abc", wide).statusLine()).not.toMatch(/memory/i);
  });
});
