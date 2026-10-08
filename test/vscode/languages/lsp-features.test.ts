import { describe, expect, it } from "vitest";
import { codeActionKindContains } from "../../../src/Lsp/codeActions.js";
import { decodeSemanticTokens } from "../../../src/Lsp/semanticTokens.js";
import { renderInlayHints } from "../../../src/Lsp/inlayHints.js";
import { activeSignatureParameter } from "../../../src/Lsp/signatureHelp.js";
import { code } from "../harness.js";

// Language features that come from providers (a language server, or code
// registered with ctx.languages, the way VS Code extensions do it):
//   ctx.languages.registerDefinitionProvider(language, { provideDefinition })
//   ...TypeDefinition, Implementation, Reference, Hover, SignatureHelp,
//   DocumentFormattingEdit, DocumentRangeFormattingEdit, OnTypeFormatting,
//   CodeActions, Rename, CompletionItem
// Locations: { path, range: { start: { line, character }, end } }.
//
// Commands: editor.action.revealDefinition (F12), goToTypeDefinition,
// goToImplementation (Ctrl+F12), referenceSearch.trigger (Shift+F12, the
// list is ctx.references()), showHover (ctx.hover()), triggerParameterHints,
// formatDocument (Shift+Alt+F), formatSelection (Ctrl+K Ctrl+F),
// codeAction (args { kind, apply: "first" | "ifSingle" | "never",
// preferred }).
//
// Pure helpers, proposed:
//   codeActionKindContains(parent, child)      src/Lsp/codeActions.ts
//   decodeSemanticTokens(data, legend)         src/Lsp/semanticTokens.ts
//   renderInlayHints(line, hints)              src/Lsp/inlayHints.ts
//   activeSignatureParameter(help)             src/Lsp/signatureHelp.ts

const pos = (line: number, character: number) => ({ line, character });
const range = (sl: number, sc: number, el: number, ec: number) => ({
  start: pos(sl, sc),
  end: pos(el, ec),
});

describe("go to definition", () => {
  it("revealDefinition moves to the definition in the same file", () => {
    const vs = code("const x = 1;\nx|;", { path: "a.ts" });
    vs.ctx.languages.registerDefinitionProvider("typescript", {
      provideDefinition: () => [{ path: "a.ts", range: range(0, 6, 0, 7) }],
    });

    vs.run("editor.action.revealDefinition");

    expect(vs.state()).eq("const |x = 1;\nx;");
  });

  it("opens another file for a definition there", () => {
    const vs = code("|x", { path: "a.ts" });
    vs.ide.open("b.ts", "export const x = 1;");
    vs.ide.open("a.ts", "x");
    vs.ctx.languages.registerDefinitionProvider("typescript", {
      provideDefinition: () => [{ path: "b.ts", range: range(0, 13, 0, 14) }],
    });

    vs.run("editor.action.revealDefinition");

    expect(vs.window().document.file.path()).eq("b.ts");
    expect(vs.window().cursor()).toMatchObject({ line: 0, column: 13 });
  });

  it("goToImplementation and goToTypeDefinition use their own providers", () => {
    const vs = code("a|\nb\nc", { path: "a.ts" });
    vs.ctx.languages.registerImplementationProvider("typescript", {
      provideImplementation: () => [{ path: "a.ts", range: range(1, 0, 1, 1) }],
    });
    vs.ctx.languages.registerTypeDefinitionProvider("typescript", {
      provideTypeDefinition: () => [{ path: "a.ts", range: range(2, 0, 2, 1) }],
    });

    expect(vs.run("editor.action.goToImplementation").window().cursor().line).eq(1);
    expect(vs.run("editor.action.goToTypeDefinition").window().cursor().line).eq(2);
  });
});

describe("references and hover", () => {
  it("lists references sorted by file and position", () => {
    const vs = code("x|", { path: "a.ts" });
    vs.ctx.languages.registerReferenceProvider("typescript", {
      provideReferences: () => [
        { path: "b.ts", range: range(4, 0, 4, 1) },
        { path: "a.ts", range: range(9, 0, 9, 1) },
        { path: "a.ts", range: range(2, 0, 2, 1) },
      ],
    });

    vs.run("editor.action.referenceSearch.trigger");

    expect(vs.ctx.references().map((r: { path: string; range: { start: { line: number } } }) => `${r.path}:${r.range.start.line}`)).toEqual([
      "a.ts:2",
      "a.ts:9",
      "b.ts:4",
    ]);
  });

  it("showHover shows what the provider returns", () => {
    const vs = code("x|", { path: "a.ts" });
    vs.ctx.languages.registerHoverProvider("typescript", {
      provideHover: () => ({ contents: ["const x: number"] }),
    });

    vs.run("editor.action.showHover");

    expect(vs.ctx.hover()?.contents).toEqual(["const x: number"]);
  });
});

describe("signature help", () => {
  it("highlights the parameter the server says is active", () => {
    expect(
      activeSignatureParameter({
        signatures: [{ label: "f(a, b)", parameters: [{ label: "a" }, { label: "b" }] }],
        activeSignature: 0,
        activeParameter: 1,
      }),
    ).toEqual({ label: "b", start: 5, end: 6 });
  });

  it("uses the signature's own activeParameter over the top-level one", () => {
    expect(
      activeSignatureParameter({
        signatures: [
          { label: "f(a, b)", parameters: [{ label: "a" }, { label: "b" }], activeParameter: 0 },
        ],
        activeSignature: 0,
        activeParameter: 1,
      })?.label,
    ).eq("a");
  });

  it("accepts parameter labels given as [start, end] offsets", () => {
    expect(
      activeSignatureParameter({
        signatures: [{ label: "f(a, b)", parameters: [{ label: [2, 3] }, { label: [5, 6] }] }],
        activeSignature: 0,
        activeParameter: 0,
      }),
    ).toEqual({ label: "a", start: 2, end: 3 });
  });
});

describe("formatting", () => {
  it("formatDocument applies the formatter's edits", () => {
    const vs = code("x=1", { path: "a.ts" });
    vs.ctx.languages.registerDocumentFormattingEditProvider("typescript", {
      provideDocumentFormattingEdits: () => [{ range: range(0, 0, 0, 3), newText: "x = 1;" }],
    });

    expect(vs.run("editor.action.formatDocument").lines()).toEqual(["x = 1;"]);
  });

  it("formatSelection passes the selected range", () => {
    const vs = code("a\n«b»\nc", { path: "a.ts" });
    let seen: unknown = null;
    vs.ctx.languages.registerDocumentRangeFormattingEditProvider("typescript", {
      provideDocumentRangeFormattingEdits: (_doc: unknown, r: unknown) => {
        seen = r;
        return [];
      },
    });

    vs.run("editor.action.formatSelection");

    expect(seen).toEqual(range(1, 0, 1, 1));
  });

  it("is one undo step", () => {
    const vs = code("x=1", { path: "a.ts" });
    vs.ctx.languages.registerDocumentFormattingEditProvider("typescript", {
      provideDocumentFormattingEdits: () => [{ range: range(0, 0, 0, 3), newText: "x = 1;" }],
    });

    expect(vs.run("editor.action.formatDocument").run("undo").lines()).toEqual(["x=1"]);
  });
});

describe("code action kinds", () => {
  it("a kind contains its children", () => {
    expect(codeActionKindContains("refactor", "refactor.extract.function")).eq(true);
    expect(codeActionKindContains("refactor.extract", "refactor.extract.function")).eq(true);
  });

  it("matches whole segments only", () => {
    expect(codeActionKindContains("refactor.ex", "refactor.extract")).eq(false);
  });

  it("a kind contains itself", () => {
    expect(codeActionKindContains("quickfix", "quickfix")).eq(true);
  });

  it("the empty kind contains everything", () => {
    expect(codeActionKindContains("", "source.organizeImports")).eq(true);
  });
});

describe("applying code actions", () => {
  function withActions(actions: { title: string; kind: string; isPreferred?: boolean; newText: string }[]) {
    const vs = code("|x", { path: "a.ts" });
    vs.ctx.languages.registerCodeActionsProvider("typescript", {
      provideCodeActions: () =>
        actions.map((a) => ({
          title: a.title,
          kind: a.kind,
          isPreferred: a.isPreferred,
          edit: { changes: { "a.ts": [{ range: range(0, 0, 0, 1), newText: a.newText }] } },
        })),
    });
    return vs;
  }

  it("apply first applies the first matching action", () => {
    const vs = withActions([
      { title: "A", kind: "refactor.extract.constant", newText: "A" },
      { title: "B", kind: "refactor.extract.function", newText: "B" },
    ]);

    vs.run("editor.action.codeAction", { kind: "refactor.extract", apply: "first" });

    expect(vs.lines()).toEqual(["A"]);
  });

  it("apply ifSingle applies only when one action matches", () => {
    const one = withActions([{ title: "A", kind: "quickfix", newText: "A" }]);
    const two = withActions([
      { title: "A", kind: "quickfix", newText: "A" },
      { title: "B", kind: "quickfix", newText: "B" },
    ]);

    one.run("editor.action.codeAction", { kind: "quickfix", apply: "ifSingle" });
    two.run("editor.action.codeAction", { kind: "quickfix", apply: "ifSingle" });

    expect(one.lines()).toEqual(["A"]);
    expect(two.lines()).toEqual(["x"]);
  });

  it("preferred only considers preferred actions", () => {
    const vs = withActions([
      { title: "A", kind: "quickfix", newText: "A" },
      { title: "B", kind: "quickfix", isPreferred: true, newText: "B" },
    ]);

    vs.run("editor.action.codeAction", { kind: "quickfix", apply: "first", preferred: true });

    expect(vs.lines()).toEqual(["B"]);
  });
});

describe("semantic tokens", () => {
  const legend = { tokenTypes: ["variable", "function"], tokenModifiers: ["declaration", "readonly"] };

  it("decodes the relative encoding into positions", () => {
    // [deltaLine, deltaStart, length, type, modifiers] per token
    const data = [0, 4, 3, 0, 1, 0, 6, 2, 1, 0, 2, 2, 5, 0, 3];

    expect(decodeSemanticTokens(data, legend)).toEqual([
      { line: 0, start: 4, length: 3, type: "variable", modifiers: ["declaration"] },
      { line: 0, start: 10, length: 2, type: "function", modifiers: [] },
      { line: 2, start: 2, length: 5, type: "variable", modifiers: ["declaration", "readonly"] },
    ]);
  });

  it("returns nothing for no data", () => {
    expect(decodeSemanticTokens([], legend)).toEqual([]);
  });
});

describe("inlay hints", () => {
  it("draws hint labels into the line at their positions", () => {
    expect(
      renderInlayHints("const x = f(1)", [
        { position: 7, label: ": number", paddingLeft: false },
        { position: 12, label: "a:", paddingRight: true },
      ]),
    ).eq("const x: number = f(a: 1)");
  });

  it("adds padding where asked", () => {
    expect(renderInlayHints("ab", [{ position: 1, label: "x", paddingLeft: true, paddingRight: true }])).eq(
      "a x b",
    );
  });
});
