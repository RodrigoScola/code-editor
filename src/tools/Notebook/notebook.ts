// Jupyter notebooks (.ipynb, nbformat 4), the document model only

// an output as nbformat stores it
export interface NotebookOutput {
  output_type: "stream" | "execute_result" | "display_data" | "error" | (string & {});
  // stream: "stdout" | "stderr"
  name?: string;
  text?: string | string[];
  // mime type -> content
  data?: Record<string, string | string[]>;
  metadata?: Record<string, unknown>;
  execution_count?: number | null;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export type CellKind = "code" | "markup";

export interface NotebookCell {
  // raw cells are markup
  kind: CellKind;
  // one string, even when the file stores a list of lines
  source: string;
  outputs: NotebookOutput[];
  executionCount: number | null;
  metadata: Record<string, unknown>;
}

export class Notebook {
  // throws for notebooks older than version 4
  static parse(text: string): Notebook {
    throw new Error("not implemented");
  }

  get cells(): NotebookCell[] {
    throw new Error("not implemented");
  }

  // metadata.kernelspec.language, else metadata.language_info.name, else
  // "python"
  get language(): string {
    throw new Error("not implemented");
  }

  // indented by one space like Jupyter, source as a list of lines,
  // everything it didn't understand kept
  serialize(): string {
    throw new Error("not implemented");
  }

  insert(index: number, kind: CellKind, source = ""): void {
    throw new Error("not implemented");
  }

  delete(index: number): void {
    throw new Error("not implemented");
  }

  move(from: number, to: number): void {
    throw new Error("not implemented");
  }

  // at a character offset in the source
  split(index: number, offset: number): void {
    throw new Error("not implemented");
  }

  // with the next cell
  join(index: number): void {
    throw new Error("not implemented");
  }

  // to markup drops the outputs and the count
  setKind(index: number, kind: CellKind): void {
    throw new Error("not implemented");
  }

  // one cell's, or every cell's
  clearOutputs(index?: number): void {
    throw new Error("not implemented");
  }

  // like a kernel writing: joins with the last output of the same stream,
  // "\r" goes back to the start of the line
  appendStream(index: number, name: "stdout" | "stderr", text: string): void {
    throw new Error("not implemented");
  }
}

// what a terminal shows for an output
export function outputText(output: NotebookOutput): string {
  throw new Error("not implemented");
}
