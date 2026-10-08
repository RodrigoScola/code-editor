import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// Splitting the editor area (Vim windows). <C-w>h/j/k/l to move between
// splits already has specs in test/unit/editor/windows/window-manager.
//   <C-w>v / :vsplit   side by side       <C-w>s / :split   top and bottom
//   <C-w>w             next split         <C-w>q            close this split
//   <C-w>o             close all others   <C-w>> / <C-w><   wider / narrower
//   <C-w>=             make all splits the same size
// A new split shows the same document as the one it came from, so an edit
// in one shows in the other.

const size = { width: 80, height: 20 };

const widths = (ide: ReturnType<typeof vim>) => {
  ide.screen();
  return ide.visibleCodeWindows().map((w) => w.view().layout().width);
};

describe("splitting", () => {
  it("<C-w>v puts two windows side by side", () => {
    const ide = vim("|abc", size).keys("<C-w>v");
    ide.screen();
    const [left, right] = ide.visibleCodeWindows().map((w) => w.view().layout());

    expect(ide.visibleCodeWindows()).length(2);
    expect(left.y).eq(right.y);
    expect(left.x).not.eq(right.x);
  });

  it("<C-w>s puts them on top of each other", () => {
    const ide = vim("|abc", size).keys("<C-w>s");
    ide.screen();
    const [top, bottom] = ide.visibleCodeWindows().map((w) => w.view().layout());

    expect(ide.visibleCodeWindows()).length(2);
    expect(top.x).eq(bottom.x);
    expect(top.y).not.eq(bottom.y);
  });

  it(":vsplit and :split work too", () => {
    expect(vim("|abc", size).keys(":vsplit<CR>").visibleCodeWindows()).length(2);
    expect(vim("|abc", size).keys(":split<CR>").visibleCodeWindows()).length(2);
  });

  it("both halves show the same document", () => {
    const ide = vim("|abc", size).keys("<C-w>v");
    const [a, b] = ide.visibleCodeWindows();

    expect(a.document).eq(b.document);
  });

  it("an edit in one half shows in the other", () => {
    const ide = vim("|abc", size).keys("<C-w>viX<Esc>");
    const lines = ide.visibleCodeWindows().map((w) => w.buffer().at(0));

    expect(lines).toEqual(["Xabc", "Xabc"]);
  });

  it("the halves split the width evenly", () => {
    const [a, b] = widths(vim("|abc", size).keys("<C-w>v"));

    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });
});

describe("moving between and closing splits", () => {
  it("<C-w>w moves focus to the other split", () => {
    const ide = vim("|abc", size).keys("<C-w>v");
    const before = ide.window();

    ide.keys("<C-w>w");

    expect(ide.window()).not.eq(before);
  });

  it("<C-w>q closes the focused split", () => {
    const ide = vim("|abc", size).keys("<C-w>v");
    expect(ide.visibleCodeWindows()).length(2);

    expect(ide.keys("<C-w>q").visibleCodeWindows()).length(1);
  });

  it("<C-w>o closes every other split", () => {
    const ide = vim("|abc", size).keys("<C-w>v<C-w>s");
    expect(ide.visibleCodeWindows()).length(3);

    expect(ide.keys("<C-w>o").visibleCodeWindows()).length(1);
  });
});

describe("sizing splits", () => {
  it("<C-w>> makes the focused split wider", () => {
    const ide = vim("|abc", size).keys("<C-w>v");
    const index = ide.visibleCodeWindows().indexOf(ide.window());
    const before = widths(ide)[index];

    ide.keys("<C-w>>");

    expect(widths(ide)[index]).eq(before + 1);
  });

  it("<C-w>= makes them the same size again", () => {
    const ide = vim("|abc", size).keys("<C-w>v<C-w>><C-w>><C-w>>");

    ide.keys("<C-w>=");
    const [a, b] = widths(ide);

    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });
});
