import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Edge cases for the find widget (base spec: find-widget.test.ts).

const find = (text: string, args: Record<string, unknown>) => code(text).executeCommand("find.openWith", args);
const next = "find.next";
const replaceAll = "find.replaceAll";

describe("matching", () => {
  it("whole word treats _ as part of a word", () => {
    expect(find("foo foo_bar", { searchString: "foo", matchWholeWord: true }).window().find().matchesCount).eq(1);
  });

  it("a non-regex search treats special characters literally", () => {
    expect(find("a.b axb", { searchString: "a.b" }).window().find().matchesCount).eq(1);
  });

  it("a search with a line break matches across lines", () => {
    expect(find("a\nb\na\nc", { searchString: "a\nb" }).window().find().matchesCount).eq(1);
  });

  it("$ matches at every line end", () => {
    expect(find("a\nb", { searchString: "$", isRegex: true }).window().find().matchesCount).eq(2);
  });

  it("an empty search string finds nothing", () => {
    expect(find("abc", { searchString: "" }).window().find().matchesCount).eq(0);
  });

  it("the count updates as the text changes", () => {
    const ide = find("|x foo", { searchString: "foo" });
    ide.type("foo ");

    expect(ide.window().find().matchesCount).eq(2);
  });
});

describe("moving", () => {
  it("next from inside a match goes to the next one, not the same one", () => {
    expect(find("f|oo foo", { searchString: "foo" }).executeCommand(next).state()).eq("foo «foo»");
  });

  it("with no matches the selection stays", () => {
    expect(find("a|bc", { searchString: "zzz" }).executeCommand(next).state()).eq("a|bc");
  });

  it("position is 0 when the cursor is not on a match", () => {
    expect(find("|x foo", { searchString: "foo" }).window().find().matchesPosition).eq(0);
  });
});

describe("replacing", () => {
  it("replaceOne when not on a match first moves to the next match", () => {
    const ide = find("|x foo foo", { searchString: "foo", replaceString: "bar" });

    ide.executeCommand("find.replaceOne");

    expect(ide.state()).eq("x «foo» foo");
  });

  it("replacing with nothing deletes", () => {
    expect(find("a-b-c", { searchString: "-", replaceString: "" }).executeCommand(replaceAll).lines()).toEqual(["abc"]);
  });

  it("$0 is the whole match too", () => {
    expect(find("ab", { searchString: "b", replaceString: "<$0>", isRegex: true }).executeCommand(replaceAll).lines()).toEqual([
      "a<b>",
    ]);
  });

  it("$$ is a literal dollar", () => {
    expect(find("ab", { searchString: "b", replaceString: "$$", isRegex: true }).executeCommand(replaceAll).lines()).toEqual(["a$"]);
  });

  it("\\n in a regex replacement inserts a line break", () => {
    expect(find("a,b", { searchString: ",", replaceString: "\\n", isRegex: true }).executeCommand(replaceAll).lines()).toEqual([
      "a",
      "b",
    ]);
  });

  it("\\t inserts a tab", () => {
    expect(find("a,b", { searchString: ",", replaceString: "\\t", isRegex: true }).executeCommand(replaceAll).lines()).toEqual([
      "a\tb",
    ]);
  });

  it("case modifiers stack", () => {
    expect(
      find("foo", { searchString: "(foo)", replaceString: "\\u\\u$1", isRegex: true }).executeCommand(replaceAll).lines(),
    ).toEqual(["FOo"]);
  });

  it("preserve case keeps title case across a hyphen", () => {
    expect(
      find("Foo-Bar", { searchString: "foo-bar", replaceString: "baz-qux", preserveCase: true }).executeCommand(replaceAll).lines(),
    ).toEqual(["Baz-Qux"]);
  });

  it("replace all inside the selection only", () => {
    expect(
      find("«foo foo» foo", { searchString: "foo", replaceString: "x", findInSelection: true }).executeCommand(replaceAll).lines(),
    ).toEqual(["x x foo"]);
  });
});
