import { describe, expect, it } from "vitest";
import { detectLanguage } from "../../../src/Language/languages.js";
import { code } from "../harness.js";

// files.associations: the user maps file patterns to languages. Extends
// detectLanguage from test/ide/editor/language-detection.test.ts:
//
//   detectLanguage(path, firstLine?, { associations? }) -> language id
//     associations: { [pattern]: languageId }  (setting file_associations)
//     - a pattern without "/" matches the file name ("*.tpl", "Jenkinsfile")
//     - a pattern with "/" matches the whole path ("**/config/*.conf")
//     - user associations win over the built-in extensions, file names and
//       #! lines
//     - when several patterns match, the longest pattern wins
//     - matching is case-insensitive on file names (Windows and macOS file
//       systems don't care about case)
//
// In the editor (VS Code: workbench.action.editor.changeLanguageMode, Ctrl+K M):
//   textEditor.changeLanguage (args { language }) sets the document's
//   language; the status line shows it

const assoc = (associations: Record<string, string>) => ({ associations });

describe("associations by file name", () => {
  it("maps an extension that has no language of its own", () => {
    expect(detectLanguage("page.tpl", undefined, assoc({ "*.tpl": "html" }))).eq("html");
  });

  it("maps an exact file name", () => {
    expect(detectLanguage("ci/Jenkinsfile", undefined, assoc({ Jenkinsfile: "groovy" }))).eq("groovy");
  });

  it("wins over a built-in extension", () => {
    expect(detectLanguage("a.js", undefined, assoc({ "*.js": "javascriptreact" }))).eq("javascriptreact");
  });

  it("wins over a #! line", () => {
    expect(detectLanguage("run", "#!/usr/bin/env python", assoc({ run: "shellscript" }))).eq("shellscript");
  });

  it("ignores case in the file name", () => {
    expect(detectLanguage("PAGE.TPL", undefined, assoc({ "*.tpl": "html" }))).eq("html");
  });

  it("leaves other files alone", () => {
    expect(detectLanguage("a.ts", undefined, assoc({ "*.tpl": "html" }))).eq("typescript");
  });

  it("handles extensions with several dots", () => {
    expect(detectLanguage("a.test.snap", undefined, assoc({ "*.test.snap": "javascript" }))).eq(
      "javascript",
    );
  });
});

describe("associations by path", () => {
  it("matches the whole path when the pattern has a slash", () => {
    const associations = assoc({ "**/config/*.conf": "ini" });

    expect(detectLanguage("/srv/app/config/main.conf", undefined, associations)).eq("ini");
    expect(detectLanguage("/srv/app/other/main.conf", undefined, associations)).not.eq("ini");
  });

  it("matches Windows paths too", () => {
    expect(
      detectLanguage("C:\\app\\config\\main.conf", undefined, assoc({ "**/config/*.conf": "ini" })),
    ).eq("ini");
  });
});

describe("several matches", () => {
  it("the longest pattern wins", () => {
    const associations = assoc({ "*.json": "jsonc", "*.settings.json": "json" });

    expect(detectLanguage("app.settings.json", undefined, associations)).eq("json");
    expect(detectLanguage("app.json", undefined, associations)).eq("jsonc");
  });
});

describe("in the editor", () => {
  it("the file_associations setting picks the language of opened files", () => {
    const ide = code("|x", { path: "a.txt" }).setting("file_associations", { "*.tpl": "html" });

    ide.openMemoryFile("page.tpl", "<b>");

    expect(ide.document().language()).eq("html");
  });

  it("changeLanguage changes the current document's language", () => {
    const ide = code("|x = 1", { path: "a.txt" });

    ide.executeCommand("textEditor.changeLanguage", { language: "python" });

    expect(ide.document().language()).eq("python");
  });

  it("the status line shows the new language", () => {
    const ide = code("|x = 1", { path: "a.txt", width: 80 });

    ide.executeCommand("textEditor.changeLanguage", { language: "python" });

    expect(ide.statusLine().toLowerCase()).toContain("python");
  });
});
