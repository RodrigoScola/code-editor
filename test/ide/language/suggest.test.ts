import { describe, expect, it } from "vitest";
import { fuzzyScore, rankSuggestions } from "../../../src/Language/suggest.js";
import { code } from "../harness.js";

// Proposed module src/Language/suggest.ts: VS Code's suggest widget logic.
//
//   fuzzyScore(typed, label) -> number | null
//     the first typed character must match "strongly": at the start of the
//     label, after a separator (_ - . / space) or on a camelCase hump; the
//     rest may skip characters. Prefix and consecutive matches score
//     higher. null when it doesn't match.
//   rankSuggestions(items, typed, options) -> items in display order
//     options.snippetSuggestions: "top" | "bottom" | "inline" | "none"
//     options.selection: "first" | "recentlyUsed" | "recentlyUsedByPrefix"
//     options.memory: what was picked before, { [prefix]: label, last: label }
//     returns { items, selected } (selected is an index)
//
// In the editor (providers from ctx.languages.registerCompletionItemProvider):
//   editor.action.triggerSuggest / acceptSelectedSuggestion / selectNextSuggestion
//   editor.suggest.insertMode: "insert" keeps the text after the cursor,
//     "replace" replaces the rest of the word
//   editor.acceptSuggestionOnEnter: "on" | "smart" (only when it changes
//     the text) | "off"
//   commit characters accept the suggestion and are then typed

describe("fuzzyScore", () => {
  it("matches a prefix", () => {
    expect(fuzzyScore("cre", "createApplication")).not.toBeNull();
  });

  it("matches camelCase humps", () => {
    expect(fuzzyScore("cra", "createApplication")).not.toBeNull();
    expect(fuzzyScore("ap", "createApplication")).not.toBeNull();
  });

  it("does not match when the first character only matches in the middle of a word", () => {
    expect(fuzzyScore("re", "createApplication")).toBeNull();
  });

  it("matches after separators", () => {
    expect(fuzzyScore("bar", "foo_bar")).not.toBeNull();
  });

  it("ignores case", () => {
    expect(fuzzyScore("CRE", "createApplication")).not.toBeNull();
  });

  it("scores a prefix above a later match", () => {
    expect(fuzzyScore("ap", "apple")!).toBeGreaterThan(fuzzyScore("ap", "createApplication")!);
  });

  it("scores consecutive matches above scattered ones", () => {
    expect(fuzzyScore("abc", "abcd")!).toBeGreaterThan(fuzzyScore("abc", "aXbXc")!);
  });
});

const item = (label: string, kind = "text") => ({ label, kind });

describe("rankSuggestions", () => {
  it("drops items that don't match and puts the best first", () => {
    const { items } = rankSuggestions([item("zebra"), item("forEach"), item("for")], "for", {});

    expect(items.map((i: { label: string }) => i.label)).toEqual(["for", "forEach"]);
  });

  it("snippets on top", () => {
    const { items } = rankSuggestions([item("fora"), item("forb", "snippet")], "for", {
      snippetSuggestions: "top",
    });

    expect(items[0].label).eq("forb");
  });

  it("snippets at the bottom", () => {
    const { items } = rankSuggestions([item("fora", "snippet"), item("forb")], "for", {
      snippetSuggestions: "bottom",
    });

    expect(items.at(-1).label).eq("fora");
  });

  it("no snippets", () => {
    const { items } = rankSuggestions([item("fora", "snippet"), item("forb")], "for", {
      snippetSuggestions: "none",
    });

    expect(items.map((i: { label: string }) => i.label)).toEqual(["forb"]);
  });

  it("first selects the top item", () => {
    expect(rankSuggestions([item("fa"), item("fb")], "f", { selection: "first" }).selected).eq(0);
  });

  it("recentlyUsed selects what was picked last", () => {
    const result = rankSuggestions([item("fa"), item("fb")], "f", {
      selection: "recentlyUsed",
      memory: { last: "fb" },
    });

    expect(result.items[result.selected].label).eq("fb");
  });

  it("recentlyUsedByPrefix remembers per typed prefix", () => {
    const options = {
      selection: "recentlyUsedByPrefix",
      memory: { f: "fa", fb: "fbc" },
    };

    const forF = rankSuggestions([item("fa"), item("fbc")], "f", options);
    const forFb = rankSuggestions([item("fbc"), item("fbd")], "fb", options);

    expect(forF.items[forF.selected].label).eq("fa");
    expect(forFb.items[forFb.selected].label).eq("fbc");
  });
});

describe("suggestions in the editor", () => {
  function withWords(text: string, words: string[]) {
    const ide = code(text, { path: "a.ts" });
    ide.languages.registerCompletionItemProvider("typescript", {
      provideCompletionItems: () => words.map((label) => ({ label })),
    });
    return ide;
  }

  it("accepting inserts the selected suggestion", () => {
    const ide = withWords("fo|", ["foobar"])
      .executeCommand("suggest.trigger")
      .executeCommand("suggest.accept");

    expect(ide.state()).eq("foobar|");
  });

  it("insert mode keeps the text after the cursor", () => {
    const ide = withWords("fo|xyz", ["foo"])
      .setting("suggest_insert_mode", "insert")
      .executeCommand("suggest.trigger")
      .executeCommand("suggest.accept");

    expect(ide.state()).eq("foo|xyz");
  });

  it("replace mode replaces the rest of the word", () => {
    const ide = withWords("fo|xyz", ["foo"])
      .setting("suggest_insert_mode", "replace")
      .executeCommand("suggest.trigger")
      .executeCommand("suggest.accept");

    expect(ide.state()).eq("foo|");
  });

  it("selectNextSuggestion moves down the list", () => {
    const ide = withWords("f|", ["fa", "fb"])
      .executeCommand("suggest.trigger")
      .executeCommand("suggest.selectNext")
      .executeCommand("suggest.accept");

    expect(ide.state()).eq("fb|");
  });

  it("smart Enter does not accept a suggestion that changes nothing", () => {
    const ide = withWords("foo|", ["foo"])
      .setting("accept_suggestion_on_enter", "smart")
      .executeCommand("suggest.trigger")
      .type("\n");

    expect(ide.lines()).toEqual(["foo", ""]);
  });

  it("a commit character accepts and is then typed", () => {
    const ide = code("con|", { path: "a.ts" });
    ide.languages.registerCompletionItemProvider("typescript", {
      provideCompletionItems: () => [{ label: "console", commitCharacters: ["."] }],
    });

    ide.executeCommand("suggest.trigger").type(".");

    expect(ide.state()).eq("console.|");
  });
});
