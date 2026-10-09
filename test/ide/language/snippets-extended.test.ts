import { describe, expect, it } from "vitest";
import {
  parseSnippetFile,
  resolveSnippet,
  snippetAppliesTo,
} from "../../../src/Language/snippets.js";
import { code } from "../harness.js";

// VS Code snippet syntax beyond the basics in test/ide/language/snippets:
// variables, transforms, conditionals, and snippet files.
//
// Proposed additions to src/Language/snippets.ts:
//   resolveSnippet(body, context) -> the text, with tab stops resolved to
//     their default text (variables and transforms applied)
//     context: { file?, workspaceFolder?, workspaceName?, selectedText?,
//       currentLine?, currentWord?, lineIndex?, clipboard?, language?,
//       now?: Date, cursorIndex?, random? }
//   parseSnippetFile(jsonText, { language? }) -> [{ name, prefixes, body,
//     description?, scopes?, isFileTemplate, include?, exclude? }]
//   snippetAppliesTo(snippet, path) -> boolean (include/exclude globs)
//
// Editor: editor.action.insertSnippet with { snippet } or { langId, name }.

const file = "/home/me/project/src/main.test.ts";
const context = {
  file,
  workspaceFolder: "/home/me/project",
  workspaceName: "project",
  lineIndex: 4,
  currentLine: "let value = 1",
  currentWord: "value",
  selectedText: "",
  clipboard: "copied",
  language: "typescript",
  // Tuesday, 5 March 2024, 07:08:09.010 local time
  now: new Date(2024, 2, 5, 7, 8, 9, 10),
};

const resolve = (body: string, extra = {}) => resolveSnippet(body, { ...context, ...extra });

describe("file and editor variables", () => {
  it("TM_FILENAME and TM_FILENAME_BASE", () => {
    expect(resolve("$TM_FILENAME")).eq("main.test.ts");
    expect(resolve("$TM_FILENAME_BASE")).eq("main.test");
  });

  it("TM_DIRECTORY, TM_FILEPATH and RELATIVE_FILEPATH", () => {
    expect(resolve("$TM_DIRECTORY")).eq("/home/me/project/src");
    expect(resolve("$TM_FILEPATH")).eq(file);
    expect(resolve("$RELATIVE_FILEPATH")).eq("src/main.test.ts");
  });

  it("TM_LINE_INDEX is 0-based and TM_LINE_NUMBER 1-based", () => {
    expect(resolve("$TM_LINE_INDEX $TM_LINE_NUMBER")).eq("4 5");
  });

  it("TM_CURRENT_LINE and TM_CURRENT_WORD", () => {
    expect(resolve("$TM_CURRENT_WORD in $TM_CURRENT_LINE")).eq("value in let value = 1");
  });

  it("TM_SELECTED_TEXT with a default for when nothing is selected", () => {
    expect(resolve("(${TM_SELECTED_TEXT:empty})")).eq("(empty)");
    expect(resolve("(${TM_SELECTED_TEXT:empty})", { selectedText: "abc" })).eq("(abc)");
  });

  it("CLIPBOARD, WORKSPACE_NAME and WORKSPACE_FOLDER", () => {
    expect(resolve("$CLIPBOARD $WORKSPACE_NAME $WORKSPACE_FOLDER")).eq(
      "copied project /home/me/project",
    );
  });
});

describe("date and time variables", () => {
  it("year, month and day", () => {
    expect(resolve("$CURRENT_YEAR $CURRENT_YEAR_SHORT $CURRENT_MONTH $CURRENT_DATE")).eq(
      "2024 24 03 05",
    );
  });

  it("names of months and days", () => {
    expect(
      resolve("$CURRENT_MONTH_NAME $CURRENT_MONTH_NAME_SHORT $CURRENT_DAY_NAME $CURRENT_DAY_NAME_SHORT"),
    ).eq("March Mar Tuesday Tue");
  });

  it("hours, minutes and seconds, padded", () => {
    expect(resolve("$CURRENT_HOUR:$CURRENT_MINUTE:$CURRENT_SECOND")).eq("07:08:09");
  });

  it("seconds since the epoch", () => {
    expect(resolve("$CURRENT_SECONDS_UNIX")).eq(String(Math.floor(context.now.getTime() / 1000)));
  });
});

describe("random variables", () => {
  it("RANDOM is six digits", () => {
    expect(resolve("$RANDOM")).toMatch(/^\d{6}$/);
  });

  it("RANDOM_HEX is six hex digits", () => {
    expect(resolve("$RANDOM_HEX")).toMatch(/^[0-9a-f]{6}$/);
  });

  it("UUID is a version 4 UUID", () => {
    expect(resolve("$UUID")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("comment variables", () => {
  it("use the language's comment tokens", () => {
    expect(resolve("$LINE_COMMENT $BLOCK_COMMENT_START $BLOCK_COMMENT_END")).eq("// /* */");
    expect(resolve("$LINE_COMMENT", { language: "python" })).eq("#");
  });
});

describe("unknown variables", () => {
  it("become a placeholder with the variable's name", () => {
    expect(resolve("$NOT_A_VARIABLE")).eq("NOT_A_VARIABLE");
  });
});

describe("transforms", () => {
  it("replace with a regex group", () => {
    expect(resolve("${TM_FILENAME/(.*)\\..+$/$1/}")).eq("main.test");
  });

  it("the g option replaces every match", () => {
    expect(resolve("${TM_FILENAME/[.]/_/g}")).eq("main_test_ts");
  });

  it("format options change case", () => {
    expect(resolve("${TM_FILENAME_BASE/(.*)/${1:/upcase}/}")).eq("MAIN.TEST");
    expect(resolve("${TM_CURRENT_WORD/(.*)/${1:/capitalize}/}")).eq("Value");
    expect(resolve("${TM_CURRENT_WORD/(.*)/${1:/downcase}/}", { currentWord: "VALUE" })).eq("value");
  });

  it("camelcase, pascalcase, snakecase and kebabcase", () => {
    const word = { currentWord: "my-long_name" };

    expect(resolve("${TM_CURRENT_WORD/(.*)/${1:/camelcase}/}", word)).eq("myLongName");
    expect(resolve("${TM_CURRENT_WORD/(.*)/${1:/pascalcase}/}", word)).eq("MyLongName");
    expect(resolve("${TM_CURRENT_WORD/(.*)/${1:/snakecase}/}", { currentWord: "myLongName" })).eq(
      "my_long_name",
    );
    expect(resolve("${TM_CURRENT_WORD/(.*)/${1:/kebabcase}/}", { currentWord: "myLongName" })).eq(
      "my-long-name",
    );
  });

  it("conditional inserts", () => {
    expect(resolve("${TM_SELECTED_TEXT/(.+)/${1:+yes}/}", { selectedText: "x" })).eq("yes");
    expect(resolve("${TM_CURRENT_WORD/(z)?.*/${1:?has z:no z}/}")).eq("no z");
    expect(resolve("${TM_CURRENT_WORD/(z)?.*/${1:-fallback}/}")).eq("fallback");
  });
});

describe("snippet files", () => {
  const json = `{
    // comments are allowed
    "Log": {
      "prefix": ["log", "cl"],
      "body": ["console.log($1);", "$0"],
      "description": "Log to the console"
    },
    "Test": {
      "prefix": "test",
      "scope": "javascript,typescript",
      "body": "it('$1', () => {})",
      "include": ["**/*.test.ts"],
      "exclude": ["**/legacy/**"]
    },
    "New component": {
      "prefix": "comp",
      "isFileTemplate": true,
      "body": "export {}"
    }
  }`;

  it("reads prefixes, bodies and descriptions", () => {
    const [log] = parseSnippetFile(json);

    expect(log).toMatchObject({
      name: "Log",
      prefixes: ["log", "cl"],
      body: "console.log($1);\n$0",
      description: "Log to the console",
    });
  });

  it("splits the scope list", () => {
    expect(parseSnippetFile(json)[1].scopes).toEqual(["javascript", "typescript"]);
  });

  it("knows file templates", () => {
    expect(parseSnippetFile(json)[2].isFileTemplate).eq(true);
  });

  it("include and exclude decide which files a snippet is offered in", () => {
    const test = parseSnippetFile(json)[1];

    expect(snippetAppliesTo(test, "/p/src/a.test.ts")).eq(true);
    expect(snippetAppliesTo(test, "/p/src/a.ts")).eq(false);
    expect(snippetAppliesTo(test, "/p/legacy/a.test.ts")).eq(false);
  });
});

describe("insertSnippet", () => {
  it("inserts a snippet given in the arguments", () => {
    const ide = code("|").executeCommand("textEditor.insertSnippet", { snippet: "console.log($1)$0" });

    expect(ide.state()).eq("console.log(|)");
  });

  it("wraps the selection when the snippet uses TM_SELECTED_TEXT", () => {
    const ide = code("«abc»").executeCommand("textEditor.insertSnippet", { snippet: "($TM_SELECTED_TEXT)" });

    expect(ide.lines()).toEqual(["(abc)"]);
  });

  it("numbers the cursors with CURSOR_NUMBER", () => {
    const ide = code("a|\nb|").executeCommand("textEditor.insertSnippet", { snippet: "$CURSOR_NUMBER" });

    expect(ide.lines()).toEqual(["a1", "b2"]);
  });

  it("finds a registered snippet by language and name", () => {
    const ide = code("|", { path: "a.ts" });
    ide.snippets.add("typescript", { name: "Log", prefix: "log", body: "console.log($1)" });

    ide.executeCommand("textEditor.insertSnippet", { langId: "typescript", name: "Log" });

    expect(ide.state()).eq("console.log(|)");
  });
});
