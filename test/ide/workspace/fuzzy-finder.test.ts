import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyMatch } from "../../../src/Search/fuzzy.js";
import { vim, workspace } from "../harness.js";

// Proposed module src/Search/fuzzy.ts, used by the file finder (<C-p>),
// the command palette and completion.
//
//   fuzzyMatch(query, text) -> { score, positions } | null
//     the query's characters must appear in order, ignoring case;
//     positions are the matched indexes (for highlighting)
//   fuzzyFilter(query, items, toText?) -> the matching items, best first
//
// Ranking, best first: consecutive characters, matches at the start of a
// word or path segment (after / _ - . or a lower-to-upper case change),
// matches in the file name rather than the folders, shorter texts.
//
// The finder needs to know the project folder: ctx.setWorkspace(path).

describe("fuzzyMatch", () => {
  it("matches the characters in order with gaps", () => {
    expect(fuzzyMatch("abc", "a_b_c")?.positions).toEqual([0, 2, 4]);
  });

  it("does not match out of order", () => {
    expect(fuzzyMatch("abc", "acb")).toBeNull();
  });

  it("does not match missing characters", () => {
    expect(fuzzyMatch("abz", "abc")).toBeNull();
  });

  it("ignores case", () => {
    expect(fuzzyMatch("ABC", "abc")).not.toBeNull();
  });

  it("an empty query matches anything", () => {
    expect(fuzzyMatch("", "anything")).not.toBeNull();
  });
});

describe("fuzzyFilter ranking", () => {
  it("drops what does not match", () => {
    expect(fuzzyFilter("xyz", ["abc", "xaybzc"])).toEqual(["xaybzc"]);
  });

  it("puts consecutive matches first", () => {
    expect(fuzzyFilter("edi", ["e_d_i", "editor"])).toEqual(["editor", "e_d_i"]);
  });

  it("puts matches at word starts first", () => {
    expect(fuzzyFilter("fb", ["xfxb", "foo_bar"])[0]).eq("foo_bar");
  });

  it("counts a case change as a word start", () => {
    expect(fuzzyFilter("fb", ["xfxbx", "fooBar"])[0]).eq("fooBar");
  });

  it("prefers matches in the file name over the folders", () => {
    expect(fuzzyFilter("index", ["index/foo.ts", "src/index.ts"])[0]).eq(
      "src/index.ts",
    );
  });

  it("prefers shorter texts when otherwise equal", () => {
    expect(fuzzyFilter("ab", ["abc", "ab"])).toEqual(["ab", "abc"]);
  });

  it("can match on a field of each item", () => {
    const items = [{ name: "save" }, { name: "quit" }];

    expect(fuzzyFilter("qu", items, (item) => item.name)).toEqual([{ name: "quit" }]);
  });

  it("an empty query keeps everything in order", () => {
    expect(fuzzyFilter("", ["b", "a"])).toEqual(["b", "a"]);
  });
});

describe("<C-p> file finder", () => {
  function project() {
    const root = workspace({
      "src/main.ts": "main",
      "src/domain.ts": "domain",
      "README.md": "readme",
    });
    const ide = vim("|", { width: 60, height: 16 });
    ide.ctx.setWorkspace(root);
    return { root, ide };
  }

  it("opens the best match on <CR>", () => {
    const { root, ide } = project();

    ide.keys("<C-p>mai<CR>");

    expect(ide.window().document.file.path()).eq(join(root, "src", "main.ts"));
  });

  it("lists the matching files while typing", () => {
    const { ide } = project();

    const shown = ide.keys("<C-p>mai").screen().join("\n");

    expect(shown).toContain("main.ts");
    expect(shown).not.toContain("README.md");
  });

  it("<Esc> closes it without opening anything", () => {
    const { ide } = project();
    const before = ide.window();

    ide.keys("<C-p>mai<Esc>");

    expect(ide.window()).eq(before);
    expect(ide.mode()).eq("normal");
  });
});
