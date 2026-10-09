import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// CodeLens: actionable text above lines ("3 references", "Run Test").
// Providers (ctx.languages.registerCodeLensProvider(language, provider)):
//   provideCodeLenses(document) -> [{ range, command? }]
//   resolveCodeLens(lens) -> the lens with its command filled in (called
//     only for lenses without a command, lazily)
// ctx.codeLenses(path) -> [{ line, title, command }] resolved, by line;
// lenses on the same line show together, joined with " | "
// (codeLensLine(path, line)). editor.codeLens false turns them off.
// Running one: ctx.commands.execute(lens.command.command, ctx, ...args)

const range = (line: number) => ({ start: { line, character: 0 }, end: { line, character: 1 } });

function withLenses(lenses: unknown[], resolve?: (lens: any) => unknown) {
  const ide = code("a\nb\nc", { path: "a.ts" });
  ide.languages.registerCodeLensProvider("typescript", {
    provideCodeLenses: () => lenses,
    resolveCodeLens: resolve,
  });
  return ide;
}

describe("code lens", () => {
  it("shows lenses that already have a command", () => {
    const ide = withLenses([{ range: range(1), command: { title: "Run Test", command: "test.run" } }]);

    expect(ide.codeLenses("a.ts")).toEqual([{ line: 1, title: "Run Test", command: { title: "Run Test", command: "test.run" } }]);
  });

  it("resolves lenses without a command", () => {
    const ide = withLenses([{ range: range(0) }], (lens) => ({ ...lens, command: { title: "3 references", command: "refs" } }));

    expect(ide.codeLenses("a.ts")[0].title).eq("3 references");
  });

  it("orders lenses by line", () => {
    const ide = withLenses([
      { range: range(2), command: { title: "c", command: "x" } },
      { range: range(0), command: { title: "a", command: "x" } },
    ]);

    expect(ide.codeLenses("a.ts").map((l: { title: string }) => l.title)).toEqual(["a", "c"]);
  });

  it("joins lenses on the same line with |", () => {
    const ide = withLenses([
      { range: range(0), command: { title: "Run", command: "x" } },
      { range: range(0), command: { title: "Debug", command: "y" } },
    ]);

    expect(ide.codeLensLine("a.ts", 0)).eq("Run | Debug");
  });

  it("is off with editor.codeLens false", () => {
    const ide = withLenses([{ range: range(0), command: { title: "Run", command: "x" } }]).setting("code_lens", false);

    expect(ide.codeLenses("a.ts")).toEqual([]);
  });

  it("a lens whose resolve fails is left out", () => {
    const ide = withLenses([{ range: range(0) }], () => {
      throw new Error("no");
    });

    expect(ide.codeLenses("a.ts")).toEqual([]);
  });
});
