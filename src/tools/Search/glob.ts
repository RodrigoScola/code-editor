// VS Code's glob syntax (files.exclude, search.exclude, the search boxes,
// file nesting, ...). Paths are relative to the workspace folder; \ counts
// as /.

// pattern -> true | false | { when: "$(basename).ts" } (only if a sibling
// named like that exists)
export type GlobExpression = Record<string, boolean | { when: string }>;

// * ? ** {a,b} [0-9] [!0-9]
export function match(pattern: string, path: string, options: { ignoreCase?: boolean } = {}): boolean {
  throw new Error("not implemented");
}

// any pattern that matches is enough
export function matchExpression(expression: GlobExpression, path: string, siblings: string[]): boolean {
  throw new Error("not implemented");
}
