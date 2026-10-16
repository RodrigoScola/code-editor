// The Test Explorer's model

export type TestState =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "errored"
  | "skipped"
  | "unset";

export interface TestItem {
  id: string;
  label: string;
  parentId?: string;
  path?: string;
  // lines
  range?: { start: number; end: number };
  tags?: string[];
}

export interface TestResultDetails {
  duration?: number;
  message?: string;
  expected?: string;
  actual?: string;
}

export interface TestMessage {
  text: string;
  diff?: { expected: string; actual: string };
}

export class TestTree {
  add(item: TestItem): void {
    throw new Error("not implemented");
  }

  // and its children
  remove(id: string): void {
    throw new Error("not implemented");
  }

  setResult(id: string, state: TestState, details: TestResultDetails = {}): void {
    throw new Error("not implemented");
  }

  // a parent's comes from its children: running > errored > failed >
  // queued > passed > skipped > unset
  state(id: string): TestState {
    throw new Error("not implemented");
  }

  // the ids shown: words, !word, @failed, @executed, @doc, @tag:name;
  // parents of matches stay
  filter(text: string, options: { currentFile?: string }): string[] {
    throw new Error("not implemented");
  }

  // the innermost test whose range has the line (Run Test at Cursor)
  testAt(path: string, line: number): string | undefined {
    throw new Error("not implemented");
  }

  // leaf tests that failed or errored (Rerun Failed)
  failedTests(): string[] {
    throw new Error("not implemented");
  }

  testsInFile(path: string): string[] {
    throw new Error("not implemented");
  }

  badge(kind: "failed" | "passed" | "skipped" | "off"): number {
    throw new Error("not implemented");
  }

  message(id: string): TestMessage | undefined {
    throw new Error("not implemented");
  }
}
