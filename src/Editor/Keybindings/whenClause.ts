// when clauses (keybindings, menus, views)

export type WhenValue = string | number | boolean;

export type WhenExpression =
  | { type: "literal"; value: boolean }
  // truthy when the key's value is
  | { type: "key"; key: string }
  | { type: "not"; expression: WhenExpression }
  | { type: "and" | "or"; operands: WhenExpression[] }
  // == != (=== !==), > >= < <=
  | { type: "==" | "!=" | ">" | ">=" | "<" | "<="; key: string; value: WhenValue }
  | { type: "=~"; key: string; regex: RegExp }
  // the key's value is in another key's array (or an object's keys)
  | { type: "in" | "not in"; key: string; listKey: string };

export type WhenContext = Record<string, unknown>;

// throws on a syntax error
export function parseWhen(text: string): WhenExpression {
  throw new Error("not implemented");
}

export function evaluateWhen(when: string | WhenExpression, context: WhenContext): boolean {
  throw new Error("not implemented");
}
