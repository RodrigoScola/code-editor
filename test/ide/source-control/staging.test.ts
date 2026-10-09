import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Repository } from "../../../src/Scm/repository.js";
import { revertRanges, stageRanges, unstageRanges } from "../../../src/Scm/stageRanges.js";
import { hasGit, repository } from "./git-helpers.js";

// Staging parts of a file (Git: Stage Selected Ranges, the diff editor's
// gutter buttons). Proposed module src/Scm/stageRanges.ts works on text:
//   stageRanges(indexText, workingText, lines) -> the new index text with
//     only the changes touching the selected working-tree lines staged
//   unstageRanges(headText, indexText, lines) -> the new index text with
//     the selected index lines put back to HEAD
//   revertRanges(indexText, workingText, lines) -> the new working text
//     with the selected changes thrown away
// lines: [{ start, end }] 0-based, inclusive, in the "new" side's lines.
// A deletion is selected by selecting the line where it happened.
//
// Repository (src/Scm/repository.ts): stage(paths), unstage(paths),
// discard(paths) (tracked files go back to the index, untracked files are
// deleted), stageAll(), show(ref, path) e.g. show(":", path) for the index.

const before = "a\nb\nc\nd\n";
const after = "a\nB\nc\nd\ne\n"; // line 1 changed, line 4 added

describe("stageRanges", () => {
  it("stages only the change in the selected lines", () => {
    expect(stageRanges(before, after, [{ start: 1, end: 1 }])).eq("a\nB\nc\nd\n");
  });

  it("stages the other change on its own", () => {
    expect(stageRanges(before, after, [{ start: 4, end: 4 }])).eq("a\nb\nc\nd\ne\n");
  });

  it("stages everything when every change is selected", () => {
    expect(stageRanges(before, after, [{ start: 0, end: 4 }])).eq(after);
  });

  it("stages nothing for lines with no changes", () => {
    expect(stageRanges(before, after, [{ start: 2, end: 3 }])).eq(before);
  });

  it("stages a deletion selected at the line where it happened", () => {
    expect(stageRanges("a\nb\nc\n", "a\nc\n", [{ start: 1, end: 1 }])).eq("a\nc\n");
  });

  it("keeps a missing final newline", () => {
    expect(stageRanges("a", "a\nb", [{ start: 1, end: 1 }])).eq("a\nb");
  });
});

describe("unstageRanges", () => {
  it("puts the selected staged change back to HEAD", () => {
    expect(unstageRanges(before, after, [{ start: 1, end: 1 }])).eq("a\nb\nc\nd\ne\n");
  });
});

describe("revertRanges", () => {
  it("throws away the selected working change", () => {
    expect(revertRanges(before, after, [{ start: 4, end: 4 }])).eq("a\nB\nc\nd\n");
  });
});

describe.skipIf(!hasGit())("in a real repository", () => {
  it("stage and unstage a file", async () => {
    const { root, write } = repository({ "a.txt": "one\n" });
    write("a.txt", "two\n");
    const repo = new Repository(root);

    await repo.stage(["a.txt"]);
    expect((await repo.status()).files).toContainEqual(expect.objectContaining({ path: "a.txt", index: "M" }));

    await repo.unstage(["a.txt"]);
    expect((await repo.status()).files).toContainEqual(
      expect.objectContaining({ path: "a.txt", index: ".", worktree: "M" }),
    );
  });

  it("discard puts a tracked file back and deletes an untracked one", async () => {
    const { root, write } = repository({ "a.txt": "one\n" });
    write("a.txt", "changed\n");
    write("b.txt", "new\n");
    const repo = new Repository(root);

    await repo.discard(["a.txt", "b.txt"]);

    expect(readFileSync(join(root, "a.txt"), "utf8")).eq("one\n");
    expect((await repo.status()).files).toEqual([]);
  });

  it("show reads the index version", async () => {
    const { root, write } = repository({ "a.txt": "one\n" });
    write("a.txt", "two\n");
    const repo = new Repository(root);
    await repo.stage(["a.txt"]);
    write("a.txt", "three\n");

    expect(await repo.show(":", "a.txt")).eq("two\n");
    expect(await repo.show("HEAD", "a.txt")).eq("one\n");
  });
});
