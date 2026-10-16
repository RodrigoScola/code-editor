// Finding TODO comments (the "Todo Tree" / todo-comments tools)

export interface Todo {
  // 0-based, pointing at the tag
  line: number;
  column: number;
  tag: string;
  // TODO(author):
  author?: string;
  text: string;
}

export interface WorkspaceTodo extends Todo {
  // relative to the root, "/" separators
  path: string;
}

// tags default to TODO FIXME HACK NOTE XXX BUG
export function findTodos(text: string, options: { tags?: string[] } = {}): Todo[] {
  throw new Error("not implemented");
}

// files sorted by path; skips .git, node_modules, .gitignore'd files, the
// exclude globs and binary files
export function scanTodos(
  root: string,
  options: { tags?: string[]; exclude?: string[] } = {},
): Promise<WorkspaceTodo[]> {
  throw new Error("not implemented");
}
