import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// What happens to the text when a file is saved (workbench.action.files.save):
//   files.trimTrailingWhitespace   remove white space at line ends
//   files.insertFinalNewline       make sure the file ends with a line break
//   files.trimFinalNewlines        keep at most one line break at the end
//   editor.formatOnSave            run the document formatter first
//   editor.codeActionsOnSave       { "source.organizeImports": "explicit" }
//     "explicit" runs on a manual save, "always" also on auto save,
//     "never" not at all
// Formatters and code actions come from ctx.languages providers (see
// test/ide/language/lsp-features.test.ts).

const save = "textEditor.saveFile";

function saved(text: string, settings: Record<string, unknown>, path = "a.txt") {
  const ide = code(text, { path });
  for (const [key, value] of Object.entries(settings)) ide.setting(key, value);
  ide.executeCommand(save);
  return ide.window().document.read();
}

describe("whitespace on save", () => {
  it("trims trailing white space", () => {
    expect(saved("a  \nb\t", { trim_trailing_whitespace: true })).eq("a\nb");
  });

  it("leaves it alone by default", () => {
    expect(saved("a  ", {})).eq("a  ");
  });

  it("inserts a final newline", () => {
    expect(saved("a", { insert_final_newline: true })).eq("a\n");
  });

  it("does not add a second final newline", () => {
    expect(saved("a\n", { insert_final_newline: true })).eq("a\n");
  });

  it("trims extra final newlines", () => {
    expect(saved("a\n\n\n", { trim_final_newlines: true })).eq("a\n");
  });

  it("does all three together", () => {
    expect(
      saved("a  \n\n\n", {
        trim_trailing_whitespace: true,
        insert_final_newline: true,
        trim_final_newlines: true,
      }),
    ).eq("a\n");
  });

  it("uses language-specific settings", () => {
    const text = saved("a  ", {
      trim_trailing_whitespace: true,
      "[markdown]": { trim_trailing_whitespace: false },
    }, "a.md");

    expect(text).eq("a  ");
  });
});

describe("format on save", () => {
  function withFormatter() {
    const ide = code("x=1", { path: "a.ts" });
    ide.languages.registerDocumentFormattingEditProvider("typescript", {
      provideDocumentFormattingEdits: () => [
        { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }, newText: "x = 1;" },
      ],
    });
    return ide;
  }

  it("formats before saving when formatOnSave is on", () => {
    const ide = withFormatter().setting("format_on_save", true).executeCommand(save);

    expect(ide.window().document.read()).eq("x = 1;");
  });

  it("does not format when it is off", () => {
    const ide = withFormatter().executeCommand(save);

    expect(ide.window().document.read()).eq("x=1");
  });
});

describe("code actions on save", () => {
  function withOrganizeImports(mode: string) {
    const ide = code("import b;\nimport a;", { path: "a.ts" });
    ide.languages.registerCodeActionsProvider("typescript", {
      provideCodeActions: () => [
        {
          title: "Organize Imports",
          kind: "source.organizeImports",
          edit: {
            changes: {
              "a.ts": [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 1, character: 9 } },
                  newText: "import a;\nimport b;",
                },
              ],
            },
          },
        },
      ],
    });
    ide.setting("code_actions_on_save", { "source.organizeImports": mode });
    return ide;
  }

  it("explicit runs on a manual save", () => {
    const ide = withOrganizeImports("explicit").executeCommand(save);

    expect(ide.window().document.read()).eq("import a;\nimport b;");
  });

  it("explicit does not run on an auto save", () => {
    const ide = withOrganizeImports("explicit");
    ide.executeCommand(save, { reason: "autoSave" });

    expect(ide.window().document.read()).eq("import b;\nimport a;");
  });

  it("always runs on an auto save too", () => {
    const ide = withOrganizeImports("always");
    ide.executeCommand(save, { reason: "autoSave" });

    expect(ide.window().document.read()).eq("import a;\nimport b;");
  });

  it("never does not run", () => {
    const ide = withOrganizeImports("never").executeCommand(save);

    expect(ide.window().document.read()).eq("import b;\nimport a;");
  });
});
