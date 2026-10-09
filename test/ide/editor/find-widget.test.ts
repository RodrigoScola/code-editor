import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// The find/replace widget (Ctrl+F / Ctrl+H) for the current file.
//   editor.actions.findWithArgs { searchString, replaceString, isRegex,
//     isCaseSensitive, matchWholeWord, preserveCase, findInSelection }
//   actions.find (seeds the search from the selection or the word at the
//     cursor, editor.find.seedSearchStringFromSelection)
//   editor.action.nextMatchFindAction / previousMatchFindAction  (F3 / Shift+F3)
//   editor.action.replaceOne / editor.action.replaceAll
// The widget's state is read with codeWindow.find():
//   { searchString, replaceString, matchesCount, matchesPosition (1-based,
//     0 when not on a match), isRegex, ... }
//
// Replace strings: $1..$9 groups, $& and $0 the whole match, and the case
// modifiers \u \l (next character) and \U \L (rest of the group).
// Preserve case: the replacement follows the case of what it replaces.

function find(text: string, args: Record<string, unknown>) {
  return code(text).executeCommand("find.openWith", args);
}

const next = "find.next";
const previous = "find.previous";

describe("counting matches", () => {
  it("counts every match", () => {
    expect(find("foo bar foo", { searchString: "foo" }).window().find().matchesCount).eq(2);
  });

  it("ignores case by default", () => {
    expect(find("Foo foo", { searchString: "foo" }).window().find().matchesCount).eq(2);
  });

  it("can match case", () => {
    const ide = find("Foo foo", { searchString: "foo", isCaseSensitive: true });

    expect(ide.window().find().matchesCount).eq(1);
  });

  it("can match whole words only", () => {
    const ide = find("foo food", { searchString: "foo", matchWholeWord: true });

    expect(ide.window().find().matchesCount).eq(1);
  });

  it("can use a regular expression", () => {
    const ide = find("a1 b22 c", { searchString: "\\d+", isRegex: true });

    expect(ide.window().find().matchesCount).eq(2);
  });

  it("an invalid regular expression finds nothing instead of throwing", () => {
    const ide = find("a(b", { searchString: "(", isRegex: true });

    expect(ide.window().find().matchesCount).eq(0);
  });

  it("^ matches at the start of every line", () => {
    const ide = find("ab\nab", { searchString: "^a", isRegex: true });

    expect(ide.window().find().matchesCount).eq(2);
  });
});

describe("moving between matches", () => {
  it("next selects the next match after the cursor", () => {
    expect(find("|foo bar foo", { searchString: "foo" }).executeCommand(next).state()).eq("«foo» bar foo");
  });

  it("next again goes to the following one", () => {
    expect(find("|foo bar foo", { searchString: "foo" }).executeCommand(next).executeCommand(next).state()).eq(
      "foo bar «foo»",
    );
  });

  it("wraps around at the end", () => {
    const ide = find("|foo bar foo", { searchString: "foo" }).executeCommand(next).executeCommand(next).executeCommand(next);

    expect(ide.state()).eq("«foo» bar foo");
  });

  it("previous wraps around at the start", () => {
    expect(find("|foo bar foo", { searchString: "foo" }).executeCommand(previous).state()).eq(
      "foo bar «foo»",
    );
  });

  it("knows which match it is on", () => {
    const ide = find("|foo bar foo", { searchString: "foo" }).executeCommand(next).executeCommand(next);

    expect(ide.window().find().matchesPosition).eq(2);
  });
});

describe("seeding the search string", () => {
  it("uses the selection", () => {
    const ide = code("foo «bar» baz").executeCommand("find.open");

    expect(ide.window().find().searchString).eq("bar");
  });

  it("uses the word at the cursor when nothing is selected", () => {
    const ide = code("f|oo bar").executeCommand("find.open");

    expect(ide.window().find().searchString).eq("foo");
  });

  it("does not seed with seedSearchStringFromSelection never", () => {
    const ide = code("f|oo bar")
      .setting("find_seed_from_selection", "never")
      .executeCommand("find.open");

    expect(ide.window().find().searchString).eq("");
  });
});

describe("find in selection", () => {
  it("only counts matches inside the selection", () => {
    const ide = find("«foo foo» foo", { searchString: "foo", findInSelection: true });

    expect(ide.window().find().matchesCount).eq(2);
  });
});

describe("replace", () => {
  it("replaceOne replaces the current match and moves to the next", () => {
    const ide = find("«foo» foo", { searchString: "foo", replaceString: "bar" });

    expect(ide.executeCommand("find.replaceOne").state()).eq("bar «foo»");
  });

  it("replaceAll replaces every match", () => {
    const ide = find("foo x foo", { searchString: "foo", replaceString: "bar" });

    expect(ide.executeCommand("find.replaceAll").lines()).toEqual(["bar x bar"]);
  });

  it("replaceAll is one undo step", () => {
    const ide = find("foo x foo", { searchString: "foo", replaceString: "bar" })
      .executeCommand("find.replaceAll")
      .executeCommand("textEditor.undo");

    expect(ide.lines()).toEqual(["foo x foo"]);
  });

  it("$1 and $2 insert regex groups", () => {
    const ide = find("me@host", {
      searchString: "(\\w+)@(\\w+)",
      replaceString: "$2 at $1",
      isRegex: true,
    });

    expect(ide.executeCommand("find.replaceAll").lines()).toEqual(["host at me"]);
  });

  it("$& inserts the whole match", () => {
    const ide = find("a b", { searchString: "\\w", replaceString: "[$&]", isRegex: true });

    expect(ide.executeCommand("find.replaceAll").lines()).toEqual(["[a] [b]"]);
  });

  it("\\U uppercases and \\u capitalizes a group", () => {
    const upper = find("foo", { searchString: "(foo)", replaceString: "\\U$1", isRegex: true });
    const capital = find("foo", { searchString: "(foo)", replaceString: "\\u$1", isRegex: true });

    expect(upper.executeCommand("find.replaceAll").lines()).toEqual(["FOO"]);
    expect(capital.executeCommand("find.replaceAll").lines()).toEqual(["Foo"]);
  });

  it("\\L lowercases and \\l lowercases one character", () => {
    const lower = find("FOO", { searchString: "(FOO)", replaceString: "\\L$1", isRegex: true });
    const one = find("FOO", { searchString: "(FOO)", replaceString: "\\l$1", isRegex: true });

    expect(lower.executeCommand("find.replaceAll").lines()).toEqual(["foo"]);
    expect(one.executeCommand("find.replaceAll").lines()).toEqual(["fOO"]);
  });

  it("preserve case follows the case of each match", () => {
    const ide = find("foo Foo FOO", {
      searchString: "foo",
      replaceString: "bar",
      preserveCase: true,
    });

    expect(ide.executeCommand("find.replaceAll").lines()).toEqual(["bar Bar BAR"]);
  });

  it("a regex with \\n matches across lines", () => {
    const ide = find("a\nb\nc", { searchString: "a\\nb", replaceString: "x", isRegex: true });

    expect(ide.executeCommand("find.replaceAll").lines()).toEqual(["x", "c"]);
  });

  it("an empty match like ^ inserts at every line start", () => {
    const ide = find("a\nb", { searchString: "^", replaceString: "> ", isRegex: true });

    expect(ide.executeCommand("find.replaceAll").lines()).toEqual(["> a", "> b"]);
  });
});
