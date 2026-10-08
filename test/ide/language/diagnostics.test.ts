import { describe, expect, it, vi } from "vitest";
import { DiagnosticsStore } from "../../../src/Lsp/diagnostics.js";
import { vim } from "../harness.js";

// Proposed module src/Lsp/diagnostics.ts: errors and warnings per file, from
// a language server, a linter or a build (see problem-matcher.test.ts).
//
//   diagnostic: { range: { start: { line, character }, end },
//                 severity: "error" | "warning" | "info" | "hint",
//                 message, source? }
//   store.set(path, diagnostics)    replaces that file's list
//   store.get(path)                 sorted by position
//   store.counts(path?)             { error, warning, info, hint }
//   store.next(path, position) / store.previous(path, position)  wrap around
//   store.onChange(listener)
//
// In the editor (ctx.diagnostics is a store):
//   ]d / [d jump to the next / previous one
//   they move with the text when lines are added or removed above them
//   the status line shows the counts as E:n W:n, and the message of the
//   diagnostic under the cursor

type Severity = "error" | "warning" | "info" | "hint";

const at = (line: number, character: number, severity: Severity, message = "m") => ({
  range: { start: { line, character }, end: { line, character: character + 1 } },
  severity,
  message,
});

describe("DiagnosticsStore", () => {
  it("keeps diagnostics per file", () => {
    const store = new DiagnosticsStore();
    store.set("a.ts", [at(0, 0, "error")]);
    store.set("b.ts", [at(1, 0, "warning")]);

    expect(store.get("a.ts")).length(1);
    expect(store.get("b.ts")[0].severity).eq("warning");
    expect(store.get("c.ts")).toEqual([]);
  });

  it("set replaces a file's list", () => {
    const store = new DiagnosticsStore();
    store.set("a.ts", [at(0, 0, "error")]);
    store.set("a.ts", []);

    expect(store.get("a.ts")).toEqual([]);
  });

  it("returns them sorted by position", () => {
    const store = new DiagnosticsStore();
    store.set("a.ts", [at(3, 0, "error", "c"), at(1, 5, "error", "b"), at(1, 2, "error", "a")]);

    expect(store.get("a.ts").map((d) => d.message)).toEqual(["a", "b", "c"]);
  });

  it("counts by severity, per file and in total", () => {
    const store = new DiagnosticsStore();
    store.set("a.ts", [at(0, 0, "error"), at(1, 0, "warning")]);
    store.set("b.ts", [at(0, 0, "error")]);

    expect(store.counts("a.ts")).toEqual({ error: 1, warning: 1, info: 0, hint: 0 });
    expect(store.counts()).toEqual({ error: 2, warning: 1, info: 0, hint: 0 });
  });

  it("finds the next one after a position, wrapping around", () => {
    const store = new DiagnosticsStore();
    store.set("a.ts", [at(1, 0, "error", "first"), at(5, 0, "error", "second")]);

    expect(store.next("a.ts", { line: 2, character: 0 })?.message).eq("second");
    expect(store.next("a.ts", { line: 6, character: 0 })?.message).eq("first");
  });

  it("finds the previous one, wrapping around", () => {
    const store = new DiagnosticsStore();
    store.set("a.ts", [at(1, 0, "error", "first"), at(5, 0, "error", "second")]);

    expect(store.previous("a.ts", { line: 2, character: 0 })?.message).eq("first");
    expect(store.previous("a.ts", { line: 0, character: 0 })?.message).eq("second");
  });

  it("tells listeners about changes", () => {
    const store = new DiagnosticsStore();
    const listener = vi.fn();
    store.onChange(listener);

    store.set("a.ts", [at(0, 0, "error")]);

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("diagnostics in the editor", () => {
  function withDiagnostics() {
    const ide = vim("|a\nb\nc\nd\ne", { path: "a.ts", width: 100, height: 12 });
    ide.ctx.diagnostics.set("a.ts", [
      at(1, 0, "error", "first problem"),
      at(3, 0, "warning", "second problem"),
    ]);
    return ide;
  }

  it("]d jumps to the next one", () => {
    const ide = withDiagnostics();

    expect(ide.keys("]d").cursor().line).eq(1);
    expect(ide.keys("]d").cursor().line).eq(3);
  });

  it("[d jumps to the previous one", () => {
    const ide = withDiagnostics();
    ide.window().cursor().line = 4;

    expect(ide.keys("[d").cursor().line).eq(3);
  });

  it("they move down when a line is added above them", () => {
    const ide = withDiagnostics();

    ide.keys("Ox<Esc>");

    expect(ide.ctx.diagnostics.get("a.ts")[0].range.start.line).eq(2);
  });

  it("the status line shows the counts", () => {
    const status = withDiagnostics().statusLine();

    expect(status).toMatch(/\bE:\s?1\b/);
    expect(status).toMatch(/\bW:\s?1\b/);
  });

  it("the status line shows the message under the cursor", () => {
    const ide = withDiagnostics().keys("]d");

    expect(ide.statusLine()).toContain("first problem");
  });
});
