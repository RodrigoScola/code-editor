import { describe, expect, it } from "vitest";
import { Notebook, outputText } from "../../../src/Notebook/notebook.js";

// Jupyter notebooks (.ipynb), the document model only. Running cells needs
// a kernel (a Jupyter server), which is left out like other servers.
//
// Proposed src/Notebook/notebook.ts:
//   Notebook.parse(text) -> notebook (nbformat 4)
//   notebook.cells: [{ kind: "code" | "markup", source, outputs,
//     executionCount, metadata }]
//     source is one string (the file may store it as a list of lines)
//   notebook.language -> metadata.kernelspec.language, else
//     metadata.language_info.name, else "python"
//   notebook.serialize() -> text: indented by one space like Jupyter,
//     source as a list of lines (each keeping its "\n" but the last),
//     everything it didn't understand (metadata, unknown keys) kept
//   notebook.insert(index, kind, source = "") / delete(index) /
//     move(from, to) / split(index, offset) / join(index)  (with the next) /
//     setKind(index, kind) / clearOutputs(index?)
//   notebook.appendStream(index, "stdout" | "stderr", text): like a kernel
//     writing; joins with the last output when it is the same stream, and
//     "\r" goes back to the start of the line (progress bars)
//   outputText(output) -> what a terminal shows for an output:
//     stream text; text/plain of execute_result and display_data (or
//     "[image/png]" when there is no text); for errors "ename: evalue"
//     then the traceback lines

const nb = (cells: unknown[], metadata: Record<string, unknown> = {}) =>
  JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata, cells });

const codeCell = (source: string | string[], extra: Record<string, unknown> = {}) => ({
  cell_type: "code",
  source,
  metadata: {},
  outputs: [],
  execution_count: null,
  ...extra,
});

const markdown = (source: string | string[]) => ({ cell_type: "markdown", source, metadata: {} });

describe("parsing", () => {
  it("reads code and markdown cells", () => {
    const notebook = Notebook.parse(nb([markdown("# Title"), codeCell("x = 1")]));

    expect(notebook.cells.map((c) => [c.kind, c.source])).toEqual([
      ["markup", "# Title"],
      ["code", "x = 1"],
    ]);
  });

  it("joins a source stored as a list of lines", () => {
    const notebook = Notebook.parse(nb([codeCell(["a = 1\n", "b = 2"])]));

    expect(notebook.cells[0].source).eq("a = 1\nb = 2");
  });

  it("reads the execution count", () => {
    const notebook = Notebook.parse(nb([codeCell("x", { execution_count: 3 })]));

    expect(notebook.cells[0].executionCount).eq(3);
  });

  it("finds the language", () => {
    expect(Notebook.parse(nb([], { kernelspec: { language: "julia" } })).language).eq("julia");
    expect(Notebook.parse(nb([], { language_info: { name: "r" } })).language).eq("r");
    expect(Notebook.parse(nb([])).language).eq("python");
  });

  it("refuses notebooks older than version 4", () => {
    expect(() => Notebook.parse(JSON.stringify({ nbformat: 3, worksheets: [] }))).toThrow(/version/);
  });

  it("treats raw cells as markup", () => {
    const notebook = Notebook.parse(nb([{ cell_type: "raw", source: "raw text", metadata: {} }]));

    expect(notebook.cells[0].kind).eq("markup");
  });
});

describe("saving", () => {
  it("stores source as a list of lines", () => {
    const notebook = Notebook.parse(nb([codeCell("a = 1\nb = 2")]));

    const saved = JSON.parse(notebook.serialize());
    expect(saved.cells[0].source).toEqual(["a = 1\n", "b = 2"]);
  });

  it("indents by one space and ends with a newline, like Jupyter", () => {
    const text = Notebook.parse(nb([])).serialize();

    expect(text.split("\n")[1].startsWith(' "')).eq(true);
    expect(text.endsWith("\n")).eq(true);
  });

  it("keeps what it doesn't understand", () => {
    const original = nb([codeCell("x", { metadata: { tags: ["setup"] }, id: "abc" })], {
      kernelspec: { name: "python3", language: "python" },
      custom: { anything: 1 },
    });

    const saved = JSON.parse(Notebook.parse(original).serialize());
    expect(saved.metadata.custom).toEqual({ anything: 1 });
    expect(saved.cells[0].metadata).toEqual({ tags: ["setup"] });
    expect(saved.cells[0].id).eq("abc");
  });

  it("a notebook saved without changes is the same JSON", () => {
    const original = nb([markdown(["# T\n", "text"]), codeCell(["x = 1"], { execution_count: 1 })]);

    expect(JSON.parse(Notebook.parse(original).serialize())).toEqual(JSON.parse(original));
  });
});

describe("editing cells", () => {
  const three = () => Notebook.parse(nb([codeCell("a"), codeCell("b"), codeCell("c")]));
  const sources = (n: ReturnType<typeof three>) => n.cells.map((c) => c.source);

  it("inserts", () => {
    const n = three();
    n.insert(1, "markup", "# note");

    expect(sources(n)).toEqual(["a", "# note", "b", "c"]);
    expect(n.cells[1].kind).eq("markup");
  });

  it("deletes", () => {
    const n = three();
    n.delete(0);

    expect(sources(n)).toEqual(["b", "c"]);
  });

  it("moves", () => {
    const n = three();
    n.move(0, 2);

    expect(sources(n)).toEqual(["b", "c", "a"]);
  });

  it("splits a cell at an offset", () => {
    const n = Notebook.parse(nb([codeCell("x = 1\ny = 2")]));
    n.split(0, 6);

    expect(sources(n)).toEqual(["x = 1", "y = 2"]);
  });

  it("joins a cell with the next one", () => {
    const n = three();
    n.join(0);

    expect(sources(n)).toEqual(["a\nb", "c"]);
  });

  it("changing a code cell to markup drops its outputs and count", () => {
    const n = Notebook.parse(
      nb([codeCell("x", { execution_count: 2, outputs: [{ output_type: "stream", name: "stdout", text: "1\n" }] })]),
    );
    n.setKind(0, "markup");

    expect(n.cells[0]).toMatchObject({ kind: "markup", outputs: [], executionCount: null });
  });

  it("clears the outputs of one cell or all", () => {
    const out = { output_type: "stream", name: "stdout", text: "1\n" };
    const n = Notebook.parse(
      nb([codeCell("a", { outputs: [out], execution_count: 1 }), codeCell("b", { outputs: [out], execution_count: 2 })]),
    );

    n.clearOutputs(0);
    expect(n.cells.map((c) => c.outputs.length)).toEqual([0, 1]);

    n.clearOutputs();
    expect(n.cells.map((c) => c.outputs.length)).toEqual([0, 0]);
    expect(n.cells[1].executionCount).eq(null);
  });
});

describe("stream output", () => {
  const empty = () => Notebook.parse(nb([codeCell("print()")]));

  it("joins writes to the same stream", () => {
    const n = empty();
    n.appendStream(0, "stdout", "a\n");
    n.appendStream(0, "stdout", "b\n");

    expect(n.cells[0].outputs).toEqual([{ output_type: "stream", name: "stdout", text: "a\nb\n" }]);
  });

  it("starts a new output when the stream changes", () => {
    const n = empty();
    n.appendStream(0, "stdout", "a\n");
    n.appendStream(0, "stderr", "oops\n");

    expect(n.cells[0].outputs.map((o) => o.name)).toEqual(["stdout", "stderr"]);
  });

  it('"\\r" overwrites the line, like a progress bar', () => {
    const n = empty();
    n.appendStream(0, "stdout", "10%");
    n.appendStream(0, "stdout", "\r50%");
    n.appendStream(0, "stdout", "\r100%\ndone\n");

    expect(outputText(n.cells[0].outputs[0])).eq("100%\ndone\n");
  });
});

describe("showing outputs", () => {
  it("stream text as it is", () => {
    expect(outputText({ output_type: "stream", name: "stdout", text: ["a\n", "b\n"] })).eq("a\nb\n");
  });

  it("the plain text of a result", () => {
    const result = { output_type: "execute_result", execution_count: 1, data: { "text/plain": ["42"], "text/html": ["<b>42</b>"] }, metadata: {} };

    expect(outputText(result)).eq("42");
  });

  it("a placeholder for an image without text", () => {
    expect(outputText({ output_type: "display_data", data: { "image/png": "iVBOR..." }, metadata: {} })).eq("[image/png]");
  });

  it("errors with their traceback", () => {
    const error = {
      output_type: "error",
      ename: "ZeroDivisionError",
      evalue: "division by zero",
      traceback: ["\x1b[0;31mTraceback\x1b[0m", "----> 1 1/0"],
    };

    expect(outputText(error)).eq("ZeroDivisionError: division by zero\n\x1b[0;31mTraceback\x1b[0m\n----> 1 1/0");
  });
});
