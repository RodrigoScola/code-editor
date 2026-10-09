import { describe, expect, it } from "vitest";
import { ansiColor, loadColorTheme } from "../../../src/Themes/colorTheme.js";

// Color themes (VS Code: workbench.colorTheme, color theme JSON files,
// workbench.colorCustomizations, editor.tokenColorCustomizations,
// editor.semanticTokenColorCustomizations).
//
// Proposed src/Themes/colorTheme.ts:
//   loadColorTheme(text, { readInclude?(path) -> text, customizations? })
//     text is the theme file (JSON with comments and trailing commas)
//     -> theme: {
//       name, type: "dark" | "light" | "hc",
//       color(id) -> "#rrggbb" or "#rrggbbaa" (lowercase), or undefined
//       tokenStyle(scopes) -> { foreground?, background?, bold, italic,
//         underline, strikethrough }
//         scopes: the token's TextMate scope stack, outermost first,
//         like ["source.ts", "meta.function.ts", "string.quoted.double.ts"]
//       semanticStyle(type, modifiers, language) -> the same, or undefined
//     }
//   ansiColor(hex, depth, layer = "foreground") -> escape sequence
//     depth: "truecolor" | "256" | "16"
//     "256" picks the nearest of the 6x6x6 cube and the 24 grays; "16" the
//     nearest of xterm's default 16 colors (30-37, 90-97)
//
// TextMate rules ({ scope, settings: { foreground, background, fontStyle } }):
//   - "string" matches "string" and "string.quoted.double", not "strings"
//   - a rule on an outer scope applies inside it, until an inner scope's
//     rule sets the same thing
//   - for one scope, the longer selector wins ("string.quoted" > "string")
//   - "meta.function string" only matches a string inside meta.function,
//     and beats a plain "string" rule
//   - when everything else is equal, the later rule wins
//   - each attribute is settled on its own: the color can come from one
//     rule and the font style from another
//   - fontStyle "" clears an inherited style
//   - scope can be a comma list or an array
//   - a rule without a scope sets the defaults (editor foreground/background)
// "include": "./base.json" loads another theme first; this one overrides it.

const theme = (json: unknown, options = {}) => loadColorTheme(JSON.stringify(json), options);

const rules = (...tokenColors: unknown[]) => theme({ name: "T", type: "dark", tokenColors });

const fg = (t: ReturnType<typeof theme>, scopes: string[]) => t.tokenStyle(scopes).foreground;

describe("loading", () => {
  it("reads the name, type and workbench colors", () => {
    const t = theme({ name: "Night", type: "dark", colors: { "editor.background": "#1E1E1E" } });

    expect(t.name).eq("Night");
    expect(t.type).eq("dark");
    expect(t.color("editor.background")).eq("#1e1e1e");
  });

  it("returns undefined for colors the theme doesn't set", () => {
    expect(theme({ name: "T", type: "dark" }).color("editor.background")).eq(undefined);
  });

  it("expands short colors", () => {
    const t = theme({ name: "T", type: "dark", colors: { a: "#abc", b: "#abcd" } });

    expect(t.color("a")).eq("#aabbcc");
    expect(t.color("b")).eq("#aabbccdd");
  });

  it("accepts comments and trailing commas", () => {
    const text = `{
      // a comment
      "name": "T", "type": "light",
      "colors": { "editor.background": "#ffffff", },
    }`;

    expect(loadColorTheme(text).color("editor.background")).eq("#ffffff");
  });

  it("ignores invalid colors", () => {
    const t = theme({ name: "T", type: "dark", colors: { a: "red", b: "#12" } });

    expect(t.color("a")).eq(undefined);
    expect(t.color("b")).eq(undefined);
  });
});

describe("scope matching", () => {
  it("a rule matches its scope and the scopes below it", () => {
    const t = rules({ scope: "string", settings: { foreground: "#ff0000" } });

    expect(fg(t, ["source.ts", "string"])).eq("#ff0000");
    expect(fg(t, ["source.ts", "string.quoted.double.ts"])).eq("#ff0000");
  });

  it("matches whole segments only", () => {
    const t = rules({ scope: "string", settings: { foreground: "#ff0000" } });

    expect(fg(t, ["source.ts", "strings.x"])).eq(undefined);
  });

  it("applies inside the scope it names", () => {
    const t = rules({ scope: "meta.embedded", settings: { foreground: "#00ff00" } });

    expect(fg(t, ["source.html", "meta.embedded.block.js", "variable.other.js"])).eq("#00ff00");
  });

  it("an inner scope's rule wins over an outer one", () => {
    const t = rules(
      { scope: "string", settings: { foreground: "#ff0000" } },
      { scope: "constant.character.escape", settings: { foreground: "#0000ff" } },
    );

    expect(fg(t, ["source.ts", "string.quoted.ts", "constant.character.escape.ts"])).eq("#0000ff");
  });

  it("the longer selector wins for the same scope, whatever the order", () => {
    const t = rules(
      { scope: "string.quoted", settings: { foreground: "#0000ff" } },
      { scope: "string", settings: { foreground: "#ff0000" } },
    );

    expect(fg(t, ["source.ts", "string.quoted.double.ts"])).eq("#0000ff");
  });

  it("the later rule wins when they are equally specific", () => {
    const t = rules(
      { scope: "string", settings: { foreground: "#ff0000" } },
      { scope: "string", settings: { foreground: "#00ff00" } },
    );

    expect(fg(t, ["source.ts", "string.quoted.ts"])).eq("#00ff00");
  });

  it("a parent selector only matches inside that parent", () => {
    const t = rules({ scope: "meta.function string", settings: { foreground: "#ff00ff" } });

    expect(fg(t, ["source.ts", "meta.function.ts", "string.quoted.ts"])).eq("#ff00ff");
    expect(fg(t, ["source.ts", "string.quoted.ts"])).eq(undefined);
  });

  it("the parent does not have to be the direct parent", () => {
    const t = rules({ scope: "meta.function string", settings: { foreground: "#ff00ff" } });

    expect(fg(t, ["source.ts", "meta.function.ts", "meta.block.ts", "string.quoted.ts"])).eq("#ff00ff");
  });

  it("a parent selector beats a plain one", () => {
    const t = rules(
      { scope: "meta.function string", settings: { foreground: "#ff00ff" } },
      { scope: "string", settings: { foreground: "#ff0000" } },
    );

    expect(fg(t, ["source.ts", "meta.function.ts", "string.quoted.ts"])).eq("#ff00ff");
  });

  it("takes comma lists and arrays", () => {
    const t = rules(
      { scope: "comment, string", settings: { foreground: "#111111" } },
      { scope: ["keyword", "storage"], settings: { foreground: "#222222" } },
    );

    expect(fg(t, ["source.ts", "comment.line.ts"])).eq("#111111");
    expect(fg(t, ["source.ts", "string.quoted.ts"])).eq("#111111");
    expect(fg(t, ["source.ts", "storage.type.ts"])).eq("#222222");
  });

  it("a rule without a scope sets the defaults", () => {
    const t = rules({ settings: { foreground: "#cccccc", background: "#000000" } });

    expect(t.tokenStyle(["source.ts"])).toMatchObject({ foreground: "#cccccc", background: "#000000" });
  });
});

describe("font styles", () => {
  it("reads every style in fontStyle", () => {
    const t = rules({ scope: "markup", settings: { fontStyle: "bold italic underline strikethrough" } });

    expect(t.tokenStyle(["text.md", "markup.bold.md"])).toMatchObject({
      bold: true,
      italic: true,
      underline: true,
      strikethrough: true,
    });
  });

  it("settles color and style separately", () => {
    const t = rules(
      { scope: "comment", settings: { fontStyle: "italic" } },
      { scope: "comment.line", settings: { foreground: "#888888" } },
    );

    expect(t.tokenStyle(["source.ts", "comment.line.ts"])).toMatchObject({
      foreground: "#888888",
      italic: true,
    });
  });

  it('fontStyle "" clears an inherited style', () => {
    const t = rules(
      { scope: "comment", settings: { fontStyle: "italic" } },
      { scope: "comment.line.todo", settings: { fontStyle: "" } },
    );

    expect(t.tokenStyle(["source.ts", "comment.line.todo.ts"]).italic).eq(false);
  });

  it("a rule without fontStyle keeps the inherited one", () => {
    const t = rules(
      { scope: "comment", settings: { fontStyle: "italic" } },
      { scope: "comment.line", settings: { foreground: "#888888" } },
    );

    expect(t.tokenStyle(["source.ts", "comment.line.ts"]).italic).eq(true);
  });
});

describe("include", () => {
  const base = {
    name: "Base",
    type: "dark",
    colors: { "editor.background": "#000000", "editor.foreground": "#ffffff" },
    tokenColors: [{ scope: "string", settings: { foreground: "#ff0000" } }],
  };
  const readInclude = (path: string) => {
    if (path.endsWith("base.json")) return JSON.stringify(base);
    throw new Error(`no ${path}`);
  };

  it("loads the included theme first", () => {
    const t = theme({ name: "Child", type: "dark", include: "./base.json" }, { readInclude });

    expect(t.color("editor.foreground")).eq("#ffffff");
    expect(fg(t, ["source.ts", "string"])).eq("#ff0000");
  });

  it("the including theme overrides colors and rules", () => {
    const t = theme(
      {
        name: "Child",
        type: "dark",
        include: "./base.json",
        colors: { "editor.background": "#111111" },
        tokenColors: [{ scope: "string", settings: { foreground: "#00ff00" } }],
      },
      { readInclude },
    );

    expect(t.color("editor.background")).eq("#111111");
    expect(t.color("editor.foreground")).eq("#ffffff");
    expect(fg(t, ["source.ts", "string"])).eq("#00ff00");
  });

  it("reports an include that loops", () => {
    const loop = () => JSON.stringify({ name: "L", type: "dark", include: "./loop.json" });

    expect(() => theme({ name: "L", type: "dark", include: "./loop.json" }, { readInclude: loop })).toThrow(
      /include/i,
    );
  });
});

describe("customizations", () => {
  const night = { name: "Night", type: "dark", colors: { "editor.background": "#000000" } };

  it("workbench color customizations override the theme", () => {
    const t = theme(night, { customizations: { colors: { "editor.background": "#101010" } } });

    expect(t.color("editor.background")).eq("#101010");
  });

  it("customizations for another theme are ignored", () => {
    const t = theme(night, {
      customizations: { colors: { "[Day]": { "editor.background": "#ffffff" } } },
    });

    expect(t.color("editor.background")).eq("#000000");
  });

  it("customizations for this theme apply, and win over general ones", () => {
    const t = theme(night, {
      customizations: {
        colors: { "editor.background": "#101010", "[Night]": { "editor.background": "#202020" } },
      },
    });

    expect(t.color("editor.background")).eq("#202020");
  });

  it("token customizations: shortcuts for common groups", () => {
    const t = theme(night, {
      customizations: { tokenColors: { comments: "#00aa00", strings: "#aa0000", numbers: "#0000aa" } },
    });

    expect(fg(t, ["source.ts", "comment.line.double-slash.ts"])).eq("#00aa00");
    expect(fg(t, ["source.ts", "string.quoted.ts"])).eq("#aa0000");
    expect(fg(t, ["source.ts", "constant.numeric.decimal.ts"])).eq("#0000aa");
  });

  it("token customizations: textMateRules win over the theme's rules", () => {
    const t = theme(
      { ...night, tokenColors: [{ scope: "keyword", settings: { foreground: "#ff0000" } }] },
      {
        customizations: {
          tokenColors: { textMateRules: [{ scope: "keyword", settings: { foreground: "#00ff00" } }] },
        },
      },
    );

    expect(fg(t, ["source.ts", "keyword.control.ts"])).eq("#00ff00");
  });
});

describe("semantic token colors", () => {
  const semantic = theme({
    name: "S",
    type: "dark",
    semanticHighlighting: true,
    tokenColors: [{ scope: "entity.name.function", settings: { foreground: "#dcdcaa" } }],
    semanticTokenColors: {
      variable: "#9cdcfe",
      "variable.readonly": { foreground: "#4fc1ff" },
      "*.declaration": { bold: true },
      "parameter:python": "#ff8800",
    },
  });

  it("matches the token type", () => {
    expect(semantic.semanticStyle("variable", [], "typescript")?.foreground).eq("#9cdcfe");
  });

  it("a selector with a modifier wins when the token has it", () => {
    expect(semantic.semanticStyle("variable", ["readonly"], "typescript")?.foreground).eq("#4fc1ff");
  });

  it("* matches any type", () => {
    expect(semantic.semanticStyle("class", ["declaration"], "typescript")?.bold).eq(true);
  });

  it("a language-specific selector only applies to that language", () => {
    expect(semantic.semanticStyle("parameter", [], "python")?.foreground).eq("#ff8800");
    expect(semantic.semanticStyle("parameter", [], "typescript")?.foreground).not.eq("#ff8800");
  });

  it("falls back to the TextMate rules through the standard scope of the type", () => {
    // VS Code maps the "function" type to entity.name.function
    expect(semantic.semanticStyle("function", [], "typescript")?.foreground).eq("#dcdcaa");
  });

  it("gives nothing when the theme turns semantic highlighting off", () => {
    const off = theme({ name: "O", type: "dark", semanticTokenColors: { variable: "#9cdcfe" } });

    expect(off.semanticStyle("variable", [], "typescript")).eq(undefined);
  });
});

describe("terminal colors", () => {
  it("truecolor writes the exact color", () => {
    expect(ansiColor("#ff8000", "truecolor")).eq("\x1b[38;2;255;128;0m");
    expect(ansiColor("#ff8000", "truecolor", "background")).eq("\x1b[48;2;255;128;0m");
  });

  it("256 colors picks the nearest cube color", () => {
    expect(ansiColor("#ff0000", "256")).eq("\x1b[38;5;196m");
    expect(ansiColor("#000000", "256")).eq("\x1b[38;5;16m");
  });

  it("256 colors uses the gray ramp for grays", () => {
    expect(ansiColor("#808080", "256")).eq("\x1b[38;5;244m");
  });

  it("16 colors picks the nearest basic color", () => {
    expect(ansiColor("#ee1111", "16")).eq("\x1b[91m");
    expect(ansiColor("#000080", "16")).eq("\x1b[34m");
  });

  it("ignores the alpha channel", () => {
    expect(ansiColor("#ff800080", "truecolor")).eq("\x1b[38;2;255;128;0m");
  });
});
