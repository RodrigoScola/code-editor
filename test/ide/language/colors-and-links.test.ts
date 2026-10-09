import { describe, expect, it } from "vitest";
import { colorPresentations, findColors } from "../../../src/Language/colors.js";
import { findLinks } from "../../../src/Language/links.js";
import { code } from "../harness.js";

// Color decorators and links in the text, which VS Code finds in any file
// even without a language server (editor.defaultColorDecorators,
// editor.links).
//
// Proposed src/Language/colors.ts:
//   findColors(text, limit = 500) -> [{ line, start, end, color }]
//     color: { red, green, blue, alpha } with red/green/blue 0-255 and alpha 0-1
//     finds #rgb #rgba #rrggbb #rrggbbaa, rgb() rgba() hsl() hsla(), any case
//     at most `limit` of them (editor.colorDecoratorsLimit, setting
//     color_decorators_limit)
//   colorPresentations(color) -> the ways to write it, for the color picker:
//     ["#ff0000", "rgb(255, 0, 0)", "hsl(0, 100%, 50%)"], with alpha when
//     it isn't 1: "#ff000080", "rgba(255, 0, 0, 0.5)", "hsla(0, 100%, 50%, 0.5)"
//
// Proposed src/Language/links.ts:
//   findLinks(text) -> [{ line, start, end, target }]
//     http(s)://, file:// and mailto: links. Punctuation that ends a sentence
//     is not part of the link; brackets are, when they are balanced
//     inside it.
//
// In the editor: textEditor.openLink (VS Code: editor.action.openLink)
// opens the link under the cursor through ctx.openExternal(target).

const one = (text: string) => findColors(text)[0];

describe("finding colors", () => {
  it.each([
    ["#f00", { red: 255, green: 0, blue: 0, alpha: 1 }],
    ["#f008", { red: 255, green: 0, blue: 0, alpha: 0x88 / 255 }],
    ["#00ff00", { red: 0, green: 255, blue: 0, alpha: 1 }],
    ["#0000ff80", { red: 0, green: 0, blue: 255, alpha: 0x80 / 255 }],
    ["rgb(1, 2, 3)", { red: 1, green: 2, blue: 3, alpha: 1 }],
    ["rgba(1, 2, 3, 0.5)", { red: 1, green: 2, blue: 3, alpha: 0.5 }],
    ["hsl(120, 100%, 50%)", { red: 0, green: 255, blue: 0, alpha: 1 }],
    ["hsla(240, 100%, 50%, 0.25)", { red: 0, green: 0, blue: 255, alpha: 0.25 }],
  ])("reads %s", (text, color) => {
    const found = one(`color: ${text};`);

    expect(found.color.red).eq(color.red);
    expect(found.color.green).eq(color.green);
    expect(found.color.blue).eq(color.blue);
    expect(found.color.alpha).toBeCloseTo(color.alpha, 2);
  });

  it("gives the position of each color", () => {
    expect(findColors("a { color: #fff; }\nb { color: rgb(0,0,0) }").map(({ line, start, end }) => [line, start, end])).toEqual([
      [0, 11, 15],
      [1, 11, 21],
    ]);
  });

  it("ignores case", () => {
    expect(one("#FFAA00").color.green).eq(0xaa);
    expect(one("RGB(1, 2, 3)").color.blue).eq(3);
  });

  it("is not fooled by hashes that aren't colors", () => {
    expect(findColors("#12 #abcde #ggg issue#123 #abcdefg")).toEqual([]);
  });

  it("rejects values out of range", () => {
    expect(findColors("rgb(300, 0, 0) hsl(0, 200%, 50%)")).toEqual([]);
  });

  it("allows spaces and no spaces inside the brackets", () => {
    expect(findColors("rgb(1,2,3) rgb( 1 , 2 , 3 )")).length(2);
  });

  it("stops at the limit", () => {
    expect(findColors("#fff ".repeat(10), 3)).length(3);
  });
});

describe("writing a color", () => {
  it("without alpha", () => {
    expect(colorPresentations({ red: 255, green: 0, blue: 0, alpha: 1 })).toEqual([
      "#ff0000",
      "rgb(255, 0, 0)",
      "hsl(0, 100%, 50%)",
    ]);
  });

  it("with alpha", () => {
    expect(colorPresentations({ red: 255, green: 0, blue: 0, alpha: 0.5 })).toEqual([
      "#ff000080",
      "rgba(255, 0, 0, 0.5)",
      "hsla(0, 100%, 50%, 0.5)",
    ]);
  });

  it("rounds hsl to whole numbers", () => {
    expect(colorPresentations({ red: 10, green: 20, blue: 30, alpha: 1 })[2]).eq("hsl(210, 50%, 8%)");
  });
});

describe("finding links", () => {
  const targets = (text: string) => findLinks(text).map((link) => link.target);

  it("finds http and https links", () => {
    expect(targets("see http://a.com and https://b.org/x?y=1#z")).toEqual([
      "http://a.com",
      "https://b.org/x?y=1#z",
    ]);
  });

  it("finds file and mailto links", () => {
    expect(targets("file:///tmp/a.txt mailto:me@example.com")).toEqual([
      "file:///tmp/a.txt",
      "mailto:me@example.com",
    ]);
  });

  it("gives the position of each link", () => {
    expect(findLinks("x\n  https://a.com y")[0]).toMatchObject({ line: 1, start: 2, end: 15 });
  });

  it("leaves out punctuation that ends a sentence", () => {
    expect(targets("Go to https://a.com/docs. Or https://b.com, or https://c.com!")).toEqual([
      "https://a.com/docs",
      "https://b.com",
      "https://c.com",
    ]);
  });

  it("leaves out a closing bracket around the link", () => {
    expect(targets("(see https://a.com/x)")).toEqual(["https://a.com/x"]);
  });

  it("keeps brackets that are part of the link", () => {
    expect(targets("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([
      "https://en.wikipedia.org/wiki/Foo_(bar)",
    ]);
  });

  it("stops at quotes and angle brackets", () => {
    expect(targets(`<a href="https://a.com/x">`)).toEqual(["https://a.com/x"]);
    expect(targets("<https://a.com/y>")).toEqual(["https://a.com/y"]);
  });

  it("ignores things that only look like links", () => {
    expect(targets("http:// nothing https:/one-slash")).toEqual([]);
  });
});

describe("in the editor", () => {
  it("openLink opens the link under the cursor", () => {
    const opened: string[] = [];
    const ide = code("read https://a.com/do|cs now");
    ide.openExternal = (target: string) => {
      opened.push(target);
    };

    ide.executeCommand("textEditor.openLink");

    expect(opened).toEqual(["https://a.com/docs"]);
  });

  it("openLink does nothing away from a link", () => {
    const opened: string[] = [];
    const ide = code("re|ad https://a.com");
    ide.openExternal = (target: string) => {
      opened.push(target);
    };

    ide.executeCommand("textEditor.openLink");

    expect(opened).toEqual([]);
  });
});
