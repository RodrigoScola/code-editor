// JSON with comments, as settings.json, tasks.json and friends are written

export interface JsoncError {
  message: string;
  offset: number;
}

export type JsonPath = (string | number)[];

// // and /* */ comments and trailing commas are allowed; on an error the
// rest is still read as well as possible
export function parseJsonc(text: string): { value: unknown; errors: JsoncError[] } {
  throw new Error("not implemented");
}

// changes only what it has to: comments and formatting elsewhere stay; a
// new property goes at the end of its object with the same indentation;
// undefined removes the property (and its comma)
export function modify(text: string, path: JsonPath, value: unknown): string {
  throw new Error("not implemented");
}

// the part of JSON Schema settings use
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  pattern?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  required?: string[];
  default?: unknown;
  description?: string;
}

export function validate(value: unknown, schema: JsonSchema): { path: JsonPath; message: string }[] {
  throw new Error("not implemented");
}
