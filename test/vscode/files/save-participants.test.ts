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
// test/vscode/languages/lsp-features.test.ts).

const save = "workbench.action.files.save";

function saved(text: string, settings: Record<string, unknown>, path = "a.txt") {
  const vs = code(text, { path });
  for (const [key, value] of Object.entries(settings)) vs.setting(key, value);
  vs.run(save);
  return vs.window().document.read();
}

describe("whitespace on save", () => {
  it("trims trailing white space", () => {
    expect(saved("a  \nb\t", { "files.trimTrailingWhitespace": true })).eq("a\nb");
  });

  it("leaves it alone by default", () => {
    expect(saved("a  ", {})).eq("a  ");
  });

  it("inserts a final newline", () => {
    expect(saved("a", { "files.insertFinalNewline": true })).eq("a\n");
  });

  it("does not add a second final newline", () => {
    expect(saved("a\n", { "files.insertFinalNewline": true })).eq("a\n");
  });

  it("trims extra final newlines", () => {
    expect(saved("a\n\n\n", { "files.trimFinalNewlines": true })).eq("a\n");
  });

  it("does all three together", () => {
    expect(
      saved("a  \n\n\n", {
        "files.trimTrailingWhitespace": true,
        "files.insertFinalNewline": true,
        "files.trimFinalNewlines": true,
      }),
    ).eq("a\n");
  });

  it("uses language-specific settings", () => {
    const text = saved("a  ", {
      "files.trimTrailingWhitespace": true,
      "[markdown]": { "files.trimTrailingWhitespace": false },
    }, "a.md");

    expect(text).eq("a  ");
  });
});

describe("format on save", () => {
  function withFormatter() {
    const vs = code("x=1", { path: "a.ts" });
    vs.ctx.languages.registerDocumentFormattingEditProvider("typescript", {
      provideDocumentFormattingEdits: () => [
        { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }, newText: "x = 1;" },
      ],
    });
    return vs;
  }

  it("formats before saving when formatOnSave is on", () => {
    const vs = withFormatter().setting("editor.formatOnSave", true).run(save);

    expect(vs.window().document.read()).eq("x = 1;");
  });

  it("does not format when it is off", () => {
    const vs = withFormatter().run(save);

    expect(vs.window().document.read()).eq("x=1");
  });
});

describe("code actions on save", () => {
  function withOrganizeImports(mode: string) {
    const vs = code("import b;\nimport a;", { path: "a.ts" });
    vs.ctx.languages.registerCodeActionsProvider("typescript", {
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
    vs.setting("editor.codeActionsOnSave", { "source.organizeImports": mode });
    return vs;
  }

  it("explicit runs on a manual save", () => {
    const vs = withOrganizeImports("explicit").run(save);

    expect(vs.window().document.read()).eq("import a;\nimport b;");
  });

  it("explicit does not run on an auto save", () => {
    const vs = withOrganizeImports("explicit");
    vs.ctx.commands.execute(save, vs.ctx, { reason: "autoSave" });

    expect(vs.window().document.read()).eq("import b;\nimport a;");
  });

  it("always runs on an auto save too", () => {
    const vs = withOrganizeImports("always");
    vs.ctx.commands.execute(save, vs.ctx, { reason: "autoSave" });

    expect(vs.window().document.read()).eq("import a;\nimport b;");
  });

  it("never does not run", () => {
    const vs = withOrganizeImports("never").run(save);

    expect(vs.window().document.read()).eq("import b;\nimport a;");
  });
});
