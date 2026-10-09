import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Quick Open (Ctrl+P) and its prefixes. Proposed model ctx.quickOpen:
//   quickOpen.query(text) -> items [{ label, description?, kind? }]
//   quickOpen.accept(index = 0)
// Prefixes:
//   (none)  files: recently opened first, then fuzzy matches on the path;
//           "name:line" and "name:line:column" open at that position
//   >       commands (the command palette), recently used first
//   @       symbols in the current file; @: groups them by kind
//   :       go to line (":12", ":12:5")
//   #       symbols in the workspace
//   ?       help: lists the prefixes
// The workspace's files come from ctx.setWorkspace (test/ide).

import { workspace } from "../../ide/harness.js";
import { join } from "node:path";

function project() {
  const root = workspace({
    "src/main.ts": "line 1\nline 2\nline 3",
    "src/domain.ts": "x",
    "README.md": "readme",
  });
  const vs = code("|", { width: 80, height: 20 });
  vs.ctx.setWorkspace(root);
  return { root, vs };
}

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe("files", () => {
  it("finds files by fuzzy name, best first", () => {
    const { vs } = project();

    expect(labels(vs.ctx.quickOpen.query("mai"))[0]).eq("main.ts");
  });

  it("shows the folder as the description", () => {
    const { vs } = project();

    expect(vs.ctx.quickOpen.query("mai")[0].description).toContain("src");
  });

  it("matches on the path too", () => {
    const { vs } = project();

    expect(labels(vs.ctx.quickOpen.query("src/dom"))).toContain("domain.ts");
  });

  it("lists recently opened files first when nothing is typed", () => {
    const { root, vs } = project();
    vs.ide.openFile(join(root, "README.md"));

    expect(labels(vs.ctx.quickOpen.query(""))[0]).eq("README.md");
  });

  it("accepting opens the file", () => {
    const { root, vs } = project();

    vs.ctx.quickOpen.query("mai");
    vs.ctx.quickOpen.accept();

    expect(vs.window().document.file.path()).eq(join(root, "src", "main.ts"));
  });

  it("name:line opens at that line", () => {
    const { vs } = project();

    vs.ctx.quickOpen.query("main.ts:3");
    vs.ctx.quickOpen.accept();

    expect(vs.window().cursor().line).eq(2);
  });

  it("name:line:column opens at that position", () => {
    const { vs } = project();

    vs.ctx.quickOpen.query("main.ts:2:4");
    vs.ctx.quickOpen.accept();

    expect(vs.window().cursor()).toMatchObject({ line: 1, column: 3 });
  });
});

describe("> commands", () => {
  function withCommands() {
    const vs = code("|");
    vs.ctx.commands.register({ id: "test.save", title: "File: Save Everything", run: () => {} });
    vs.ctx.commands.register({ id: "test.split", title: "View: Split Right", run: () => {} });
    return vs;
  }

  it("lists commands matching the text after >", () => {
    expect(labels(withCommands().ctx.quickOpen.query(">split right"))).toContain("View: Split Right");
  });

  it("accepting runs the command", () => {
    const vs = withCommands();
    let ran = false;
    vs.ctx.commands.register({ id: "test.ran", title: "Test: Ran It", run: () => (ran = true) });

    vs.ctx.quickOpen.query(">ran it");
    vs.ctx.quickOpen.accept();

    expect(ran).eq(true);
  });

  it("puts recently used commands first", () => {
    const vs = withCommands();
    vs.ctx.commands.execute("test.split", vs.ctx);

    expect(labels(vs.ctx.quickOpen.query(">"))[0]).eq("View: Split Right");
  });
});

describe("@ symbols in the file", () => {
  function withSymbols() {
    const vs = code("class A {}\nfunction b() {}\nfunction c() {}", { path: "a.ts" });
    vs.ctx.languages.registerDocumentSymbolProvider("typescript", {
      provideDocumentSymbols: () => [
        { name: "A", kind: "class", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } } },
        { name: "b", kind: "function", range: { start: { line: 1, character: 0 }, end: { line: 1, character: 15 } } },
        { name: "c", kind: "function", range: { start: { line: 2, character: 0 }, end: { line: 2, character: 15 } } },
      ],
    });
    return vs;
  }

  it("lists the symbols", () => {
    expect(labels(withSymbols().ctx.quickOpen.query("@"))).toEqual(["A", "b", "c"]);
  });

  it("filters them", () => {
    expect(labels(withSymbols().ctx.quickOpen.query("@c"))).toEqual(["c"]);
  });

  it("@: groups by kind", () => {
    const kinds = withSymbols().ctx.quickOpen.query("@:").map((i: { kind?: string }) => i.kind);

    expect(kinds).toEqual(["class", "function", "function"]);
  });

  it("accepting goes to the symbol", () => {
    const vs = withSymbols();

    vs.ctx.quickOpen.query("@c");
    vs.ctx.quickOpen.accept();

    expect(vs.window().cursor().line).eq(2);
  });
});

describe(": go to line", () => {
  it("goes to the line", () => {
    const vs = code("a\nb\nc\nd");

    vs.ctx.quickOpen.query(":3");
    vs.ctx.quickOpen.accept();

    expect(vs.window().cursor().line).eq(2);
  });

  it("takes a column", () => {
    const vs = code("abc\nabcdef");

    vs.ctx.quickOpen.query(":2:5");
    vs.ctx.quickOpen.accept();

    expect(vs.window().cursor()).toMatchObject({ line: 1, column: 4 });
  });
});

describe("# workspace symbols", () => {
  it("asks the workspace symbol provider", () => {
    const vs = code("|");
    vs.ctx.languages.registerWorkspaceSymbolProvider({
      provideWorkspaceSymbols: (query: string) =>
        query === "Wid"
          ? [{ name: "Widget", kind: "class", location: { path: "w.ts", range: { start: { line: 4, character: 0 }, end: { line: 4, character: 6 } } } }]
          : [],
    });

    expect(labels(vs.ctx.quickOpen.query("#Wid"))).toEqual(["Widget"]);
  });
});

describe("? help", () => {
  it("lists the prefixes", () => {
    const items = code("|").ctx.quickOpen.query("?");

    expect(labels(items)).toEqual(expect.arrayContaining([">", "@", ":", "#"]));
  });
});
