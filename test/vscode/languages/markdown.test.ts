import { describe, expect, it } from "vitest";
import {
  documentSymbols,
  foldingRanges,
  renderPreview,
  slugify,
  updateLinksForMove,
  validateLinks,
} from "../../../src/Language/markdown.js";
import { code } from "../harness.js";

// Proposed module src/Language/markdown.ts (VS Code's built-in Markdown
// language features).
//   slugify(heading, seen?) -> the #fragment for a heading, GitHub style:
//     lower case, punctuation dropped, spaces to "-"; repeats get -1, -2
//     when the same `seen` Set is passed for the whole document
//   documentSymbols(text) -> headings as a tree [{ name, level, line, children }]
//   foldingRanges(text) -> [{ start, end }] for heading sections, fenced
//     code blocks, and <!-- #region --> markers
//   validateLinks(text, { path, exists }) -> problems for links to missing
//     files, missing heading fragments, and undefined reference links
//     (markdown.validate.*); external links aren't checked
//   updateLinksForMove(text, docPath, oldPath, newPath) -> new text
//     (markdown.updateLinksOnFileMove)
//   renderPreview(text) -> HTML with data-line on block elements (for
//     scroll sync) and id slugs on headings
// Editor: pasting a URL over selected text makes a link
// (markdown.editor.pasteUrlAsFormattedLink.enabled).

describe("slugify", () => {
  it("lower cases and joins words with -", () => {
    expect(slugify("Hello World")).eq("hello-world");
  });

  it("drops punctuation", () => {
    expect(slugify("Hello, World!")).eq("hello-world");
  });

  it("keeps - and _", () => {
    expect(slugify("foo_bar-baz")).eq("foo_bar-baz");
  });

  it("keeps letters from other alphabets", () => {
    expect(slugify("Ünïcödé")).eq("ünïcödé");
  });

  it("turns each space into a dash even next to dropped punctuation", () => {
    expect(slugify("C++ & Rust")).eq("c--rust");
  });

  it("numbers repeated headings", () => {
    const seen = new Set<string>();

    expect([slugify("Intro", seen), slugify("Intro", seen), slugify("Intro", seen)]).toEqual([
      "intro",
      "intro-1",
      "intro-2",
    ]);
  });
});

describe("documentSymbols", () => {
  it("nests headings by level", () => {
    const symbols = documentSymbols("# A\n## B\n## C\n# D");

    expect(symbols.map((s: { name: string }) => s.name)).toEqual(["A", "D"]);
    expect(symbols[0].children.map((s: { name: string }) => s.name)).toEqual(["B", "C"]);
  });

  it("understands underlined headings", () => {
    expect(documentSymbols("Title\n=====\nSub\n---")[0]).toMatchObject({
      name: "Title",
      level: 1,
      children: [{ name: "Sub", level: 2 }],
    });
  });

  it("ignores # inside code blocks", () => {
    expect(documentSymbols("```\n# not a heading\n```\n# real")).toHaveLength(1);
  });
});

describe("foldingRanges", () => {
  it("folds a heading's section up to the next heading of the same level", () => {
    expect(foldingRanges("# A\ntext\n## B\nmore\n# C\nend")).toEqual(
      expect.arrayContaining([
        { start: 0, end: 3 },
        { start: 2, end: 3 },
      ]),
    );
  });

  it("folds a fenced code block", () => {
    expect(foldingRanges("```js\na\nb\n```")).toEqual([{ start: 0, end: 3 }]);
  });

  it("folds region markers", () => {
    expect(foldingRanges("<!-- #region -->\na\n<!-- #endregion -->")).toEqual([{ start: 0, end: 2 }]);
  });
});

describe("validateLinks", () => {
  const exists = (path: string) => ["/docs/guide.md", "/docs/img.png"].includes(path);
  const check = (text: string) => validateLinks(text, { path: "/docs/readme.md", exists });

  it("accepts links to files that exist", () => {
    expect(check("[g](./guide.md) ![i](img.png)")).toEqual([]);
  });

  it("reports links to missing files", () => {
    const [problem] = check("see [x](./nope.md)");

    expect(problem.message).toContain("nope.md");
  });

  it("reports links to headings that don't exist", () => {
    expect(check("# Intro\n[a](#intro) [b](#missing)")).toHaveLength(1);
  });

  it("reports reference links with no definition", () => {
    expect(check("[a][defined] [b][undefined]\n\n[defined]: ./guide.md")).toHaveLength(1);
  });

  it("does not check web links", () => {
    expect(check("[w](https://example.com/nope)")).toEqual([]);
  });
});

describe("updateLinksForMove", () => {
  it("rewrites a relative link when its target moves", () => {
    expect(updateLinksForMove("[g](./guide.md)", "/docs/readme.md", "/docs/guide.md", "/docs/old/guide.md")).eq(
      "[g](./old/guide.md)",
    );
  });

  it("rewrites the document's own links when the document moves", () => {
    expect(
      updateLinksForMove("[g](./guide.md)", "/docs/readme.md", "/docs/readme.md", "/docs/sub/readme.md"),
    ).eq("[g](../guide.md)");
  });

  it("keeps the #fragment", () => {
    expect(updateLinksForMove("[g](guide.md#setup)", "/docs/readme.md", "/docs/guide.md", "/docs/g2.md")).eq(
      "[g](g2.md#setup)",
    );
  });
});

describe("renderPreview", () => {
  it("gives headings ids and every block its source line", () => {
    const html = renderPreview("# Hi\n\ntext");

    expect(html).toMatch(/<h1[^>]*id="hi"/);
    expect(html).toMatch(/<h1[^>]*data-line="0"/);
    expect(html).toMatch(/<p[^>]*data-line="2"/);
  });

  it("renders emphasis, code and links", () => {
    const html = renderPreview("*a* **b** `c` [d](e)");

    expect(html).toContain("<em>a</em>");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain("<code>c</code>");
    expect(html).toContain('<a href="e">d</a>');
  });

  it("escapes HTML inside code", () => {
    expect(renderPreview("`<b>`")).toContain("<code>&lt;b&gt;</code>");
  });
});

describe("pasting a URL over a selection", () => {
  it("makes a Markdown link", () => {
    const vs = code("see «docs» here", { path: "a.md" });
    vs.ctx.clipboard.writeText("https://example.com");

    vs.run("editor.action.clipboardPasteAction");

    expect(vs.lines()).toEqual(["see [docs](https://example.com) here"]);
  });

  it("pastes plain text when nothing is selected", () => {
    const vs = code("see |", { path: "a.md" });
    vs.ctx.clipboard.writeText("https://example.com");

    expect(vs.run("editor.action.clipboardPasteAction").lines()).toEqual([
      "see https://example.com",
    ]);
  });
});
