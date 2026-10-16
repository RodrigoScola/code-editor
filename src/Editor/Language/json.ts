// VS Code's JSON language features
import type { JsonPath, JsonSchema } from "../Settings/jsonc.js";

export interface JsonSchemaAssociation {
  fileMatch: string[];
  url: string;
}

// a "$schema" in the file wins, then json.schemas, else null
export function schemaFor(
  path: string,
  text: string,
  settings: { "json.schemas"?: JsonSchemaAssociation[] },
): string | null {
  throw new Error("not implemented");
}

// JSON with comments is accepted
export function validateJson(text: string, schema: JsonSchema): { message: string; path: JsonPath }[] {
  throw new Error("not implemented");
}
