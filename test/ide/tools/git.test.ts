import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  gitStatus,
  isConflict,
  parseStatus,
} from "../../../src/tools/Git/git.js";
import { vim, workspace } from "../harness.js";

// Module src/tools/Git/git.ts (the current Git class in
// GitEditorWindow.ts runs `git status --short` and can move here).
//
//   parseStatus(output of `git status --porcelain=v1 --branch`) ->
//     { branch, upstream?, ahead, behind, gone, files }
//     branch: the branch name, or null for a detached HEAD
//     files: objects with at least { path, index, worktree, from? }
//       (a class with more fields is fine, the specs only check these)
//       index / worktree are the two status letters, " " when unchanged
//       from is where a renamed or copied file came from
//   parseStatus(output of `git status --porcelain=v1 --branch -z`, { nul: true })
//     the same, from the NUL-separated form (no quoting, see level 10)
//   isConflict(file) -> true for the unmerged pairs: DD AU UD UA DU AA UU
//   gitStatus(root) -> Promise of the same, running git in root
//
// The status line shows the branch of the workspace (ctx.setWorkspace).
//
// The parseStatus specs go from the simplest output to the hardest, in
// levels. Each level only needs the ones before it, so make them pass in
// order. One level:  npx vitest test/ide/tools/git -t "parseStatus 3 "
//
// Choices made here: lines that aren't status lines are skipped instead of
// throwing; a missing "##" line means no branch (null).

describe("parseStatus", () => {
  describe("1 nothing", () => {
    it("empty output has no files", () => {
      expect(parseStatus("").files).toEqual([]);
    });

    it("empty output has no branch, and nothing ahead or behind", () => {
      expect(parseStatus("")).toMatchObject({
        branch: null,
        ahead: 0,
        behind: 0,
      });
    });

    it("a clean repository is just the branch line", () => {
      expect(parseStatus("## main")).toMatchObject({
        branch: "main",
        files: [],
      });
    });
  });

  describe("2 one changed file", () => {
    it("a file changed in the work tree", () => {
      expect(parseStatus("## main\n M a.ts").files).toMatchObject([
        { path: "a.ts", index: " ", worktree: "M" },
      ]);
    });

    it("a file changed and staged", () => {
      expect(parseStatus("## main\nM  a.ts").files).toMatchObject([
        { path: "a.ts", index: "M", worktree: " " },
      ]);
    });

    it("a file staged, then changed again", () => {
      expect(parseStatus("## main\nMM a.ts").files).toMatchObject([
        { path: "a.ts", index: "M", worktree: "M" },
      ]);
    });

    it("works without the branch line", () => {
      expect(parseStatus(" M a.ts").files).toMatchObject([{ path: "a.ts" }]);
    });

    it("has no from when it wasn't renamed", () => {
      expect(parseStatus(" M a.ts").files[0].from).toBeNull();
    });
  });

  describe("3 every status letter", () => {
    it.each([
      ["A  a.ts", "A", " "], //  added
      ["AM a.ts", "A", "M"], //  added, then changed
      ["D  a.ts", "D", " "], //  deleted with git rm
      [" D a.ts", " ", "D"], //  deleted from disk only
      ["T  a.ts", "T", " "], //  type changed (file <-> symlink)
      ["?? a.ts", "?", "?"], //  untracked
      ["!! a.ts", "!", "!"], //  ignored (only with --ignored)
    ])("%j", (line, index, worktree) => {
      expect(parseStatus(line).files).toMatchObject([
        { path: "a.ts", index, worktree },
      ]);
    });
  });

  describe("4 several files", () => {
    const output = [
      "## main",
      " M src/a.ts",
      "?? new.txt",
      "A  added.ts",
      " D gone.ts",
    ].join("\n");

    it("reads every file", () => {
      expect(parseStatus(output).files).length(4);
    });

    it("keeps git's order", () => {
      expect(parseStatus(output).files.map((f) => f.path)).toEqual([
        "src/a.ts",
        "new.txt",
        "added.ts",
        "gone.ts",
      ]);
    });

    it("keeps the folders in the path, with forward slashes", () => {
      expect(parseStatus(" M src/deep/er/a.ts").files[0].path).eq(
        "src/deep/er/a.ts",
      );
    });

    it("an untracked folder ends with a slash", () => {
      expect(parseStatus("?? build/").files[0].path).eq("build/");
    });
  });

  describe("5 messy output", () => {
    it("ignores a trailing line break", () => {
      expect(parseStatus("## main\n M a.ts\n").files).length(1);
    });

    it("ignores blank lines", () => {
      expect(parseStatus("## main\n\n M a.ts\n\n").files).length(1);
    });

    it("reads Windows line endings", () => {
      expect(
        parseStatus("## main\r\n M a.ts\r\n?? b.ts\r\n").files.map(
          (f) => f.path,
        ),
      ).toEqual(["a.ts", "b.ts"]);
    });

    it("skips lines that aren't status lines", () => {
      const output = "## main\nwarning: something odd\n M a.ts";

      expect(parseStatus(output).files.map((f) => f.path)).toEqual(["a.ts"]);
    });
  });

  describe("6 the branch line", () => {
    it("a branch with an upstream", () => {
      expect(parseStatus("## main...origin/main")).toMatchObject({
        branch: "main",
        upstream: "origin/main",
        ahead: 0,
        behind: 0,
      });
    });

    it("a branch without an upstream has no upstream", () => {
      expect(parseStatus("## feature").upstream).toBeNull();
    });

    it.each([
      ["[ahead 3]", 3, 0],
      ["[behind 2]", 0, 2],
      ["[ahead 1, behind 2]", 1, 2],
    ])("%s", (counts, ahead, behind) => {
      expect(parseStatus(`## main...origin/main ${counts}`)).toMatchObject({
        ahead,
        behind,
      });
    });

    it("an upstream that was deleted is gone", () => {
      expect(parseStatus("## main...origin/main [gone]")).toMatchObject({
        upstream: "origin/main",
        gone: true,
        ahead: 0,
        behind: 0,
      });
    });

    it("is not gone otherwise", () => {
      expect(parseStatus("## main...origin/main [ahead 1]").gone).eq(false);
    });

    it("branch names with slashes and dots", () => {
      expect(
        parseStatus("## feature/v1.2...origin/feature/v1.2"),
      ).toMatchObject({
        branch: "feature/v1.2",
        upstream: "origin/feature/v1.2",
      });
    });

    it("a repository with no commits yet", () => {
      expect(parseStatus("## No commits yet on main").branch).eq("main");
    });

    it("the same, from older versions of git", () => {
      expect(parseStatus("## Initial commit on master").branch).eq("master");
    });

    it("a detached HEAD has no branch", () => {
      expect(parseStatus("## HEAD (no branch)").branch).toBeNull();
    });
  });

  describe("7 quoted paths", () => {
    // git puts a path in double quotes, C style, when it has spaces, quotes,
    // backslashes, control characters or (by default) non-ASCII characters

    it("a path with a space", () => {
      expect(parseStatus(' M "with space.txt"').files[0].path).eq(
        "with space.txt",
      );
    });

    it("a path that starts with a space", () => {
      expect(parseStatus('?? " lead.txt"').files[0].path).eq(" lead.txt");
    });

    it("escaped quote and backslash", () => {
      expect(parseStatus(' M "say \\"hi\\".txt"').files[0].path).eq(
        'say "hi".txt',
      );
      expect(parseStatus(' M "back\\\\slash.txt"').files[0].path).eq(
        "back\\slash.txt",
      );
    });

    it("escaped tab and newline", () => {
      expect(parseStatus('?? "a\\tb\\nc.txt"').files[0].path).eq("a\tb\nc.txt");
    });

    it("non-ASCII characters come as octal UTF-8 bytes", () => {
      // é is the bytes C3 A9, written \303\251
      expect(parseStatus('?? "caf\\303\\251.txt"').files[0].path).eq(
        "café.txt",
      );
    });

    it("a character of several bytes next to plain ones", () => {
      // 日 is E6 97 A5
      expect(parseStatus('?? "a\\346\\227\\245b.txt"').files[0].path).eq(
        "a日b.txt",
      );
    });

    it("a path that isn't quoted keeps its backslashes as they are", () => {
      // only quoted paths have escapes
      expect(parseStatus("?? plain.txt").files[0].path).eq("plain.txt");
    });
  });

  describe("8 renames and copies", () => {
    it("a staged rename", () => {
      expect(parseStatus("R  old.ts -> renamed.ts").files).toMatchObject([
        { path: "renamed.ts", from: "old.ts", index: "R", worktree: " " },
      ]);
    });

    it("renamed, then changed", () => {
      expect(parseStatus("RM old.ts -> new.ts").files).toMatchObject([
        { path: "new.ts", from: "old.ts", index: "R", worktree: "M" },
      ]);
    });

    it("a copy", () => {
      expect(parseStatus("C  a.ts -> b.ts").files).toMatchObject([
        { path: "b.ts", from: "a.ts", index: "C" },
      ]);
    });

    it("moved to another folder", () => {
      expect(parseStatus("R  src/a.ts -> lib/a.ts").files[0]).toMatchObject({
        path: "lib/a.ts",
        from: "src/a.ts",
      });
    });

    it("either side can be quoted", () => {
      expect(
        parseStatus('R  "old name.txt" -> "new name.txt"').files[0],
      ).toMatchObject({
        path: "new name.txt",
        from: "old name.txt",
      });
      expect(
        parseStatus('R  plain.txt -> "with space.txt"').files[0],
      ).toMatchObject({
        path: "with space.txt",
        from: "plain.txt",
      });
    });

    it('a quoted name that contains " -> " is not split there', () => {
      expect(parseStatus('R  "a -> b.txt" -> c.txt').files[0]).toMatchObject({
        path: "c.txt",
        from: "a -> b.txt",
      });
    });

    it("an untracked file whose name has an arrow is not a rename", () => {
      // only R and C lines have a from
      expect(parseStatus('?? "x -> y.txt"').files[0]).toMatchObject({
        path: "x -> y.txt",
      });
      expect(parseStatus('?? "x -> y.txt"').files[0].from).toBeNull();
    });
  });

  describe("9 merge conflicts", () => {
    it.each(["DD", "AU", "UD", "UA", "DU", "AA", "UU"])(
      "%s is a conflict",
      (pair) => {
        const [file] = parseStatus(`${pair} a.ts`).files;

        expect(file).toMatchObject({ index: pair[0], worktree: pair[1] });
        expect(isConflict(file)).eq(true);
      },
    );

    it.each(["M ", " M", "MM", "A ", "AM", "D ", "R ", "??"])(
      "%j is not a conflict",
      (pair) => {
        expect(isConflict(parseStatus(`${pair} a.ts`).files[0])).eq(false);
      },
    );

    it("a conflict in the middle of other changes", () => {
      const files = parseStatus(
        ["## main", "M  a.ts", "UU b.ts", "?? c.ts"].join("\n"),
      ).files;

      expect(files.filter(isConflict).map((f) => f.path)).toEqual(["b.ts"]);
    });
  });

  describe("10 the NUL-separated form (-z)", () => {
    // with -z, entries end with NUL instead of a line break, paths are never
    // quoted, and a rename is "XY new\0old\0": the new path comes FIRST
    const nul = (...entries: string[]) => entries.map((e) => e + "\0").join("");

    it("reads files and the branch", () => {
      const status = parseStatus(
        nul("## main...origin/main [ahead 1]", " M a.ts", "?? b.ts"),
        { nul: true },
      );

      expect(status).toMatchObject({
        branch: "main",
        upstream: "origin/main",
        ahead: 1,
      });
      expect(status.files.map((f) => f.path)).toEqual(["a.ts", "b.ts"]);
    });

    it("a path with a line break in it", () => {
      expect(
        parseStatus(nul("?? two\nlines.txt"), { nul: true }).files[0].path,
      ).eq("two\nlines.txt");
    });

    it("an arrow in a name is just part of the name", () => {
      expect(parseStatus(nul("?? x -> y.txt"), { nul: true }).files[0].path).eq(
        "x -> y.txt",
      );
    });
  });

  describe("11 everything together", () => {
    const output = [
      "## feature/x...origin/feature/x [ahead 2, behind 1]",
      "M  staged.ts",
      " M src/changed.ts",
      "MM both.ts",
      "A  added.ts",
      " D removed.ts",
      "R  old.ts -> renamed.ts",
      'RM "old name.ts" -> "new name.ts"',
      "UU conflict.ts",
      "?? new/",
      '?? "caf\\303\\251.md"',
    ].join("\r\n");

    it("reads the branch line", () => {
      expect(parseStatus(output)).toMatchObject({
        branch: "feature/x",
        upstream: "origin/feature/x",
        ahead: 2,
        behind: 1,
        gone: false,
      });
    });

    it("reads every file in order", () => {
      expect(parseStatus(output).files).toMatchObject([
        { path: "staged.ts", index: "M", worktree: " " },
        { path: "src/changed.ts", index: " ", worktree: "M" },
        { path: "both.ts", index: "M", worktree: "M" },
        { path: "added.ts", index: "A", worktree: " " },
        { path: "removed.ts", index: " ", worktree: "D" },
        { path: "renamed.ts", from: "old.ts", index: "R", worktree: " " },
        { path: "new name.ts", from: "old name.ts", index: "R", worktree: "M" },
        { path: "conflict.ts", index: "U", worktree: "U" },
        { path: "new/", index: "?", worktree: "?" },
        { path: "café.md", index: "?", worktree: "?" },
      ]);
    });

    it("the staged files are the ones with an index letter", () => {
      const staged = parseStatus(output)
        .files.filter(
          (f) => f.index !== " " && f.index !== "?" && !isConflict(f),
        )
        .map((f) => f.path);

      expect(staged).toEqual([
        "staged.ts",
        "both.ts",
        "added.ts",
        "renamed.ts",
        "new name.ts",
      ]);
    });
  });
});

function hasGit() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function repository() {
  const root = workspace({ "a.txt": "one\n" });
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=t", "-c", "user.email=t@t", ...args],
      {
        cwd: root,
        stdio: "ignore",
      },
    );
  git("init", "-b", "main");
  git("add", ".");
  git("commit", "-m", "first");
  return root;
}

describe.skipIf(!hasGit())("with a real repository", () => {
  it("gitStatus reports the branch and changed files", async () => {
    const root = repository();
    writeFileSync(join(root, "a.txt"), "two\n");

    const status = await gitStatus(root);

    expect(status.branch).eq("main");
    expect(status.files).toMatchObject([
      { path: "a.txt", index: " ", worktree: "M" },
    ]);
  });

  it("the status line shows the branch", async () => {
    const root = repository();
    const ide = vim("|", { width: 100 });

    ide.setWorkspace(root);

    await vi.waitFor(() => expect(ide.statusLine()).toContain("main"));
  });
});
