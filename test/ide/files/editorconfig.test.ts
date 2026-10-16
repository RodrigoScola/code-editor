import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  editorConfigFor,
  parseEditorConfig,
} from "../../../src/Editor/Files/editorconfig.js";
import { code, workspace } from "../harness.js";

// EditorConfig (https://editorconfig.org): .editorconfig files set the
// indentation, line endings and whitespace rules per file, for every editor
// on the team. Proposed module src/Files/editorconfig.ts:
//
//   parseEditorConfig(text) -> { root, sections: [{ glob, properties }] }
//     ini format, "#" and ";" start comments, keys and the values true,
//     false, tab, space, lf, crlf, unset are lowercased
//   editorConfigFor(filePath) -> the properties for that file
//     reads .editorconfig from the file's folder upwards, stopping after one
//     with root = true. Nearer files win, and inside a file later sections
//     win. "unset" removes a property. indent_size = tab means tab_width.
//
//   Globs: a glob without "/" matches the file name in any folder; with "/"
//   it is relative to the .editorconfig's folder. * doesn't cross "/", **
//   does, {a,b} is a choice, {1..3} a number range, [abc] a character set.
//
// The editor applies them to files opened from disk, over the settings:
//   indent_style space/tab  -> expand_tab
//   indent_size / tab_width -> tab_width
//   end_of_line             -> the line ending written on save
//   trim_trailing_whitespace, insert_final_newline -> the save settings of
//     test/ide/files/save-participants.test.ts

describe("parseEditorConfig", () => {
  it("reads root and sections", () => {
    const text = [
      "# comment",
      "root = true",
      "",
      "[*]",
      "indent_style = space",
      "indent_size = 2",
      "; another comment",
      "[*.md]",
      "trim_trailing_whitespace = false",
    ].join("\n");

    expect(parseEditorConfig(text)).toEqual({
      root: true,
      sections: [
        { glob: "*", properties: { indent_style: "space", indent_size: "2" } },
        { glob: "*.md", properties: { trim_trailing_whitespace: "false" } },
      ],
    });
  });

  it("lowercases keys and known values", () => {
    const { sections } = parseEditorConfig("[*]\nIndent_Style = TAB\nEnd_Of_Line = CRLF");

    expect(sections[0].properties).toEqual({ indent_style: "tab", end_of_line: "crlf" });
  });

  it("is not root unless it says so", () => {
    expect(parseEditorConfig("[*]\nindent_size = 2").root).eq(false);
  });
});

describe("editorConfigFor", () => {
  const props = (files: Record<string, string>, path: string) => {
    const root = workspace(files);
    return editorConfigFor(join(root, path));
  };

  it("applies a matching section", () => {
    expect(props({ ".editorconfig": "root=true\n[*.ts]\nindent_size=2" }, "a.ts")).toMatchObject({
      indent_size: "2",
    });
  });

  it("ignores a section that doesn't match", () => {
    expect(props({ ".editorconfig": "root=true\n[*.py]\nindent_size=4" }, "a.ts")).toEqual({});
  });

  it("later sections win", () => {
    const config = "root=true\n[*]\nindent_size=4\n[*.ts]\nindent_size=2";

    expect(props({ ".editorconfig": config }, "a.ts").indent_size).eq("2");
  });

  it("a nearer .editorconfig wins", () => {
    const files = {
      ".editorconfig": "root=true\n[*]\nindent_size=4\nend_of_line=lf",
      "sub/.editorconfig": "[*]\nindent_size=8",
    };

    expect(props(files, "sub/a.ts")).toMatchObject({ indent_size: "8", end_of_line: "lf" });
  });

  it("stops at root = true", () => {
    const files = {
      ".editorconfig": "[*]\nend_of_line=crlf",
      "project/.editorconfig": "root=true\n[*]\nindent_size=2",
    };

    expect(props(files, "project/a.ts").end_of_line).toBeUndefined();
  });

  it("unset removes a property", () => {
    const files = {
      ".editorconfig": "root=true\n[*]\nindent_size=4",
      "sub/.editorconfig": "[*]\nindent_size=unset",
    };

    expect(props(files, "sub/a.ts").indent_size).toBeUndefined();
  });

  it("indent_size = tab uses tab_width", () => {
    const config = "root=true\n[*]\nindent_size=tab\ntab_width=3";

    expect(props({ ".editorconfig": config }, "a.go").indent_size).eq("3");
  });

  it("tab_width defaults to indent_size", () => {
    expect(props({ ".editorconfig": "root=true\n[*]\nindent_size=2" }, "a.ts").tab_width).eq("2");
  });

  it.each([
    ["*.{js,ts}", "src/a.ts", true],
    ["*.{js,ts}", "a.css", false],
    ["Makefile", "deep/dir/Makefile", true],
    ["src/*.ts", "src/a.ts", true],
    ["src/*.ts", "src/deep/a.ts", false],
    ["src/**.ts", "src/deep/a.ts", true],
    ["lib/**/*.js", "lib/a/b/c.js", true],
    ["file{1..3}.txt", "file2.txt", true],
    ["file{1..3}.txt", "file4.txt", false],
    ["[ab].txt", "b.txt", true],
  ])("[%s] matches %s: %s", (glob, path, matches) => {
    const config = `root=true\n[${glob}]\nindent_size=7`;

    expect(props({ ".editorconfig": config }, path).indent_size).eq(matches ? "7" : undefined);
  });
});

describe("the editor uses it", () => {
  // the settings say tabs, 8 wide, so an indentation of spaces can only
  // come from the .editorconfig
  function opened(config: string, file = "a.ts", content = "x", expandTab = false) {
    const root = workspace({ ".editorconfig": `root = true\n${config}`, [file]: content });
    const path = join(root, file);
    const ide = code("|").setting("expand_tab", expandTab).setting("tab_width", 8);
    ide.setWorkspace(root);
    ide.openAndFocus(path);
    return { ide, path };
  }

  it("indent_style and indent_size set the indentation", () => {
    const { ide } = opened("[*]\nindent_style = space\nindent_size = 2");

    ide.keys("I<Tab><Esc>");

    expect(ide.lines()[0]).eq("  x");
  });

  it("indent_style = tab indents with a tab", () => {
    const { ide } = opened("[*]\nindent_style = tab", "a.ts", "x", true);

    ide.keys("I<Tab><Esc>");

    expect(ide.lines()[0]).eq("\tx");
  });

  it("a file the config doesn't match keeps the settings", () => {
    const { ide } = opened("[*.py]\nindent_style = space\nindent_size = 2");

    ide.keys("I<Tab><Esc>");

    expect(ide.lines()[0]).eq("\tx");
  });

  it("end_of_line = crlf is used when saving", () => {
    const { ide, path } = opened("[*]\nend_of_line = crlf", "a.txt", "a\nb\n");

    ide.keys("Az<Esc>").executeCommand("textEditor.saveFile");

    expect(readFileSync(path, "utf8")).eq("az\r\nb\r\n");
  });

  it("trim_trailing_whitespace and insert_final_newline apply on save", () => {
    const config = "[*]\ntrim_trailing_whitespace = true\ninsert_final_newline = true";
    const { ide, path } = opened(config, "a.txt", "a");

    ide.keys("A  <Esc>").executeCommand("textEditor.saveFile");

    expect(readFileSync(path, "utf8")).eq("a\n");
  });
});
