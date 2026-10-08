import { describe, expect, it } from "vitest";
import { match, matchExpression } from "../../../src/Search/glob.js";

// Proposed module src/Search/glob.ts: VS Code's glob syntax, used by
// files.exclude, search.exclude, the search include/exclude boxes, file
// nesting, snippets include/exclude and more.
//   match(pattern, path, { ignoreCase? }) -> boolean
//     path is relative to the workspace folder; \ in paths counts as /
//     *     any characters inside one path segment
//     ?     one character inside a segment
//     **    any number of segments, including none
//     {a,b} either
//     [0-9] a range, [!0-9] not in the range; a special character inside
//           brackets is literal ([[] matches "["), backslash does not escape
//   matchExpression(expression, path, siblings) -> boolean
//     expression: { pattern: true | false | { when: "$(basename).ts" } }
//     when: only if a sibling named like that exists

describe("wildcards", () => {
  it("* matches inside one segment only", () => {
    expect(match("*.ts", "a.ts")).eq(true);
    expect(match("*.ts", "src/a.ts")).eq(false);
  });

  it("**/ matches at any depth, including the top", () => {
    expect(match("**/*.ts", "a.ts")).eq(true);
    expect(match("**/*.ts", "src/deep/a.ts")).eq(true);
  });

  it("/** matches everything inside a folder", () => {
    expect(match("src/**", "src/a/b.ts")).eq(true);
    expect(match("src/**", "lib/a.ts")).eq(false);
  });

  it("** in the middle", () => {
    expect(match("**/node_modules/**", "a/node_modules/b/c.js")).eq(true);
    expect(match("**/node_modules/**", "node_modules/x")).eq(true);
  });

  it("? matches one character", () => {
    expect(match("a?.ts", "ab.ts")).eq(true);
    expect(match("a?.ts", "abc.ts")).eq(false);
    expect(match("a?b", "a/b")).eq(false);
  });

  it("* matches dot files too", () => {
    expect(match("*", ".gitignore")).eq(true);
  });

  it("**/name matches a folder or file of that name anywhere", () => {
    expect(match("**/.git", ".git")).eq(true);
    expect(match("**/.git", "sub/.git")).eq(true);
  });
});

describe("groups and ranges", () => {
  it("{a,b} matches either", () => {
    expect(match("**/*.{ts,js}", "x/a.js")).eq(true);
    expect(match("**/*.{ts,js}", "x/a.css")).eq(false);
  });

  it("{} can hold whole patterns", () => {
    expect(match("{**/*.html,**/*.txt}", "a/b.txt")).eq(true);
  });

  it("[0-9] matches a range", () => {
    expect(match("example.[0-9]", "example.3")).eq(true);
    expect(match("example.[0-9]", "example.a")).eq(false);
  });

  it("[!0-9] matches outside the range", () => {
    expect(match("example.[!0-9]", "example.a")).eq(true);
    expect(match("example.[!0-9]", "example.0")).eq(false);
  });

  it("special characters inside brackets are literal", () => {
    expect(match("src/routes/post/[[]id[]]/**", "src/routes/post/[id]/page.ts")).eq(true);
  });
});

describe("paths and case", () => {
  it("backslashes in paths count as separators", () => {
    expect(match("src/*.ts", "src\\a.ts")).eq(true);
  });

  it("is case sensitive unless told otherwise", () => {
    expect(match("**/*.TS", "a.ts")).eq(false);
    expect(match("**/*.TS", "a.ts", { ignoreCase: true })).eq(true);
  });
});

describe("matchExpression", () => {
  it("true patterns match, false ones don't", () => {
    expect(matchExpression({ "**/*.log": true }, "a.log", [])).eq(true);
    expect(matchExpression({ "**/*.log": false }, "a.log", [])).eq(false);
  });

  it("when needs the sibling", () => {
    const expression = { "**/*.js": { when: "$(basename).ts" } };

    expect(matchExpression(expression, "src/a.js", ["a.ts", "a.js"])).eq(true);
    expect(matchExpression(expression, "src/b.js", ["a.ts", "b.js"])).eq(false);
  });

  it("any matching pattern is enough", () => {
    expect(matchExpression({ "**/*.log": true, "**/tmp/**": true }, "x/tmp/y", [])).eq(true);
  });
});
