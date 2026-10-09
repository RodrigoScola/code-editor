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

import { workspace } from "../harness.js";
import { join } from "node:path";

function project() {
  const root = workspace({
    "src/main.ts": "line 1\nline 2\nline 3",
    "src/domain.ts": "x",
    "README.md": "readme",
  });
  const ide = code("|", { width: 80, height: 20 });
  ide.setWorkspace(root);
  return { root, ide };
}

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe("files", () => {
  it("finds files by fuzzy name, best first", () => {
    const { ide } = project();

    expect(labels(ide.quickOpen.query("mai"))[0]).eq("main.ts");
  });

  it("shows the folder as the description", () => {
    const { ide } = project();

    expect(ide.quickOpen.query("mai")[0].description).toContain("src");
  });

  it("matches on the path too", () => {
    const { ide } = project();

    expect(labels(ide.quickOpen.query("src/dom"))).toContain("domain.ts");
  });

  it("lists recently opened files first when nothing is typed", () => {
    const { root, ide } = project();
    ide.openAndFocus(join(root, "README.md"));

    expect(labels(ide.quickOpen.query(""))[0]).eq("README.md");
  });

  it("accepting opens the file", () => {
    const { root, ide } = project();

    ide.quickOpen.query("mai");
    ide.quickOpen.accept();

    expect(ide.window().document.file.path()).eq(join(root, "src", "main.ts"));
  });

  it("name:line opens at that line", () => {
    const { ide } = project();

    ide.quickOpen.query("main.ts:3");
    ide.quickOpen.accept();

    expect(ide.window().cursor().line).eq(2);
  });

  it("name:line:column opens at that position", () => {
    const { ide } = project();

    ide.quickOpen.query("main.ts:2:4");
    ide.quickOpen.accept();

    expect(ide.window().cursor()).toMatchObject({ line: 1, column: 3 });
  });
});

describe("> commands", () => {
  function withCommands() {
    const ide = code("|");
    ide.commands.register({ id: "test.save", title: "File: Save Everything", run: () => {} });
    ide.commands.register({ id: "test.split", title: "View: Split Right", run: () => {} });
    return ide;
  }

  it("lists commands matching the text after >", () => {
    expect(labels(withCommands().quickOpen.query(">split right"))).toContain("View: Split Right");
  });

  it("accepting runs the command", () => {
    const ide = withCommands();
    let ran = false;
    ide.commands.register({ id: "test.ran", title: "Test: Ran It", run: () => (ran = true) });

    ide.quickOpen.query(">ran it");
    ide.quickOpen.accept();

    expect(ran).eq(true);
  });

  it("puts recently used commands first", () => {
    const ide = withCommands();
    ide.executeCommand("test.split");

    expect(labels(ide.quickOpen.query(">"))[0]).eq("View: Split Right");
  });
});

describe("@ symbols in the file", () => {
  function withSymbols() {
    const ide = code("class A {}\nfunction b() {}\nfunction c() {}", { path: "a.ts" });
    ide.languages.registerDocumentSymbolProvider("typescript", {
      provideDocumentSymbols: () => [
        { name: "A", kind: "class", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } } },
        { name: "b", kind: "function", range: { start: { line: 1, character: 0 }, end: { line: 1, character: 15 } } },
        { name: "c", kind: "function", range: { start: { line: 2, character: 0 }, end: { line: 2, character: 15 } } },
      ],
    });
    return ide;
  }

  it("lists the symbols", () => {
    expect(labels(withSymbols().quickOpen.query("@"))).toEqual(["A", "b", "c"]);
  });

  it("filters them", () => {
    expect(labels(withSymbols().quickOpen.query("@c"))).toEqual(["c"]);
  });

  it("@: groups by kind", () => {
    const kinds = withSymbols().quickOpen.query("@:").map((i: { kind?: string }) => i.kind);

    expect(kinds).toEqual(["class", "function", "function"]);
  });

  it("accepting goes to the symbol", () => {
    const ide = withSymbols();

    ide.quickOpen.query("@c");
    ide.quickOpen.accept();

    expect(ide.window().cursor().line).eq(2);
  });
});

describe(": go to line", () => {
  it("goes to the line", () => {
    const ide = code("a\nb\nc\nd");

    ide.quickOpen.query(":3");
    ide.quickOpen.accept();

    expect(ide.window().cursor().line).eq(2);
  });

  it("takes a column", () => {
    const ide = code("abc\nabcdef");

    ide.quickOpen.query(":2:5");
    ide.quickOpen.accept();

    expect(ide.window().cursor()).toMatchObject({ line: 1, column: 4 });
  });
});

describe("# workspace symbols", () => {
  it("asks the workspace symbol provider", () => {
    const ide = code("|");
    ide.languages.registerWorkspaceSymbolProvider({
      provideWorkspaceSymbols: (query: string) =>
        query === "Wid"
          ? [{ name: "Widget", kind: "class", location: { path: "w.ts", range: { start: { line: 4, character: 0 }, end: { line: 4, character: 6 } } } }]
          : [],
    });

    expect(labels(ide.quickOpen.query("#Wid"))).toEqual(["Widget"]);
  });
});

describe("? help", () => {
  it("lists the prefixes", () => {
    const items = code("|").quickOpen.query("?");

    expect(labels(items)).toEqual(expect.arrayContaining([">", "@", ":", "#"]));
  });
});
