import { describe, expect, it } from "vitest";
import { countBadge, decorationFor, groupResources, parseStatusV2 } from "../../../src/Scm/status.js";
import { Repository } from "../../../src/Scm/repository.js";
import { hasGit, repository } from "./git-helpers.js";

// Proposed module src/Scm/status.ts: reading `git status --porcelain=v2
// --branch -z` (NUL separated, so paths are never quoted).
//   parseStatusV2(output) -> { oid, head, detached, upstream?, ahead, behind,
//     files: [{ path, origPath?, index, worktree, kind }] }
//     index / worktree use "." for unchanged, as git prints them
//     kind: "ordinary" | "renamed" | "unmerged" | "untracked" | "ignored"
//   groupResources(files, { untrackedChanges: "mixed" | "separate" | "hidden" })
//     -> { merge, index, workingTree, untracked } (VS Code's Merge Changes,
//        Staged Changes, Changes and Untracked Changes groups)
//   decorationFor(file, group) -> { letter, color }   (Explorer and tabs)
//     M modified, A added, D deleted, R renamed, C copied, U untracked,
//     ! conflict
//   countBadge(groups, "all" | "off") -> the number on the Source Control icon
//
// src/Scm/repository.ts: new Repository(root).status() runs git and parses.

const NUL = "\0";
const record = (...parts: string[]) => parts.join(NUL) + NUL;

const sample = record(
  "# branch.oid 1234567890abcdef1234567890abcdef12345678",
  "# branch.head main",
  "# branch.upstream origin/main",
  "# branch.ab +2 -1",
  "1 .M N... 100644 100644 100644 aaaaaaa aaaaaaa src/a.ts",
  "1 A. N... 000000 100644 100644 0000000 bbbbbbb new file.ts",
  "1 MM N... 100644 100644 100644 ccccccc ddddddd both.ts",
  "2 R. N... 100644 100644 100644 eeeeeee eeeeeee R100 renamed.ts",
  "old.ts",
  "u UU N... 100644 100644 100644 100644 fffffff ggggggg hhhhhhh conflict.ts",
  "? untracked.txt",
  "! ignored.log",
);

describe("parseStatusV2", () => {
  const status = parseStatusV2(sample);

  it("reads the branch header", () => {
    expect(status).toMatchObject({
      oid: "1234567890abcdef1234567890abcdef12345678",
      head: "main",
      detached: false,
      upstream: "origin/main",
      ahead: 2,
      behind: 1,
    });
  });

  it("reads ordinary changes", () => {
    expect(status.files).toContainEqual(
      expect.objectContaining({ path: "src/a.ts", index: ".", worktree: "M", kind: "ordinary" }),
    );
  });

  it("keeps spaces in paths", () => {
    expect(status.files.map((f: { path: string }) => f.path)).toContain("new file.ts");
  });

  it("reads renames with the original path", () => {
    expect(status.files).toContainEqual(
      expect.objectContaining({ path: "renamed.ts", origPath: "old.ts", index: "R", kind: "renamed" }),
    );
  });

  it("reads conflicts", () => {
    expect(status.files).toContainEqual(expect.objectContaining({ path: "conflict.ts", kind: "unmerged" }));
  });

  it("reads untracked and ignored files", () => {
    expect(status.files).toContainEqual(expect.objectContaining({ path: "untracked.txt", kind: "untracked" }));
    expect(status.files).toContainEqual(expect.objectContaining({ path: "ignored.log", kind: "ignored" }));
  });

  it("a new repository has no commit yet", () => {
    expect(parseStatusV2(record("# branch.oid (initial)", "# branch.head main"))).toMatchObject({
      oid: null,
      head: "main",
    });
  });

  it("a detached HEAD", () => {
    expect(parseStatusV2(record("# branch.oid abc", "# branch.head (detached)")).detached).eq(true);
  });

  it("no upstream means no ahead/behind", () => {
    expect(parseStatusV2(record("# branch.oid abc", "# branch.head dev"))).toMatchObject({
      upstream: undefined,
      ahead: 0,
      behind: 0,
    });
  });
});

describe("groupResources", () => {
  const { files } = parseStatusV2(sample);
  const paths = (list: { path: string }[]) => list.map((f) => f.path).sort();

  it("puts conflicts in merge changes", () => {
    expect(paths(groupResources(files, { untrackedChanges: "mixed" }).merge)).toEqual(["conflict.ts"]);
  });

  it("puts index changes in staged changes", () => {
    expect(paths(groupResources(files, { untrackedChanges: "mixed" }).index)).toEqual([
      "both.ts",
      "new file.ts",
      "renamed.ts",
    ]);
  });

  it("puts work tree changes and untracked files in changes (mixed)", () => {
    expect(paths(groupResources(files, { untrackedChanges: "mixed" }).workingTree)).toEqual([
      "both.ts",
      "src/a.ts",
      "untracked.txt",
    ]);
  });

  it("separate gives untracked files their own group", () => {
    const groups = groupResources(files, { untrackedChanges: "separate" });

    expect(paths(groups.untracked)).toEqual(["untracked.txt"]);
    expect(paths(groups.workingTree)).not.toContain("untracked.txt");
  });

  it("hidden leaves untracked files out", () => {
    const groups = groupResources(files, { untrackedChanges: "hidden" });

    expect([...groups.workingTree, ...groups.untracked].map((f: { path: string }) => f.path)).not.toContain(
      "untracked.txt",
    );
  });

  it("never shows ignored files", () => {
    const groups = groupResources(files, { untrackedChanges: "mixed" });
    const everything = [...groups.merge, ...groups.index, ...groups.workingTree, ...groups.untracked];

    expect(everything.map((f: { path: string }) => f.path)).not.toContain("ignored.log");
  });
});

describe("decorations and badge", () => {
  const file = (index: string, worktree: string, kind = "ordinary") => ({ path: "x", index, worktree, kind });

  it("letters for each state", () => {
    expect(decorationFor(file(".", "M"), "workingTree").letter).eq("M");
    expect(decorationFor(file("A", "."), "index").letter).eq("A");
    expect(decorationFor(file(".", "D"), "workingTree").letter).eq("D");
    expect(decorationFor(file("R", ".", "renamed"), "index").letter).eq("R");
    expect(decorationFor(file("?", "?", "untracked"), "untracked").letter).eq("U");
    expect(decorationFor(file("U", "U", "unmerged"), "merge").letter).eq("!");
  });

  it("the badge counts every change, or nothing when off", () => {
    const groups = groupResources(parseStatusV2(sample).files, { untrackedChanges: "mixed" });
    const total = groups.merge.length + groups.index.length + groups.workingTree.length + groups.untracked.length;

    expect(countBadge(groups, "all")).eq(total);
    expect(countBadge(groups, "off")).eq(0);
  });
});

describe.skipIf(!hasGit())("in a real repository", () => {
  it("status reports a modified file and an untracked one", async () => {
    const { root, write } = repository({ "a.txt": "one\n" });
    write("a.txt", "two\n");
    write("b.txt", "new\n");

    const status = await new Repository(root).status();

    expect(status.head).eq("main");
    expect(status.files).toContainEqual(expect.objectContaining({ path: "a.txt", worktree: "M" }));
    expect(status.files).toContainEqual(expect.objectContaining({ path: "b.txt", kind: "untracked" }));
  });
});
