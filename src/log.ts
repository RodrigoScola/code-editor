import fs from "fs";

const OUT_FILE = "out.txt";

export function log(...args: unknown[]) {
  const line = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
    .join(" ");
  fs.appendFileSync(OUT_FILE, line + "\n");
}
