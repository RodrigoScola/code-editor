// The list behind the completion popup, whatever the items come from

export interface CompletionItem {
  label: string;
  insertText?: string;
  sortText?: string;
  kind?: string;
  detail?: string;
}

export class CompletionSession<I extends CompletionItem = CompletionItem> {
  constructor(items: I[]) {}

  // best first: prefix matches, then fuzzy matches; ties by sortText, then
  // label. Resets the selection to the first
  filter(prefix: string): I[] {
    throw new Error("not implemented");
  }

  selected(): I | undefined {
    throw new Error("not implemented");
  }

  // wraps
  next(): void {
    throw new Error("not implemented");
  }

  previous(): void {
    throw new Error("not implemented");
  }
}
