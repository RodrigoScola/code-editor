import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { gitStatus, parseStatus } from "../../../src/Tools/git.js";
import { vim, workspace } from "../harness.js";

// Proposed module src/Tools/git.ts (the current Git class in
// GitEditorWindow.ts runs `git status --short` and can move here).
//
//   parseStatus(output of `git status --porcelain=v1 --branch`) ->
//     { branch, upstream?, ahead, behind,
//       files: [{ path, index, worktree, from? }] }
//     index / worktree are the two status letters (" " when unchanged)
//   gitStatus(root) -> Promise of the same, running git in root
//
// The status line shows the branch of the workspace (ctx.setWorkspace).

const STATUS = [
  "## main...origin/main [ahead 1, behind 2]",
  " M src/a.ts",
  "?? new.txt",
  "A  added.ts",
  "R  old.ts -> renamed.ts",
  " D gone.ts",
  ' M "with space.txt"',
].join("\n");

describe("parseStatus", () => {
  it("reads the branch, upstream, ahead and behind", () => {
    expect(parseStatus(STATUS)).toMatchObject({
      branch: "main",
      upstream: "origin/main",
      ahead: 1,
      behind: 2,
    });
  });

  it("reads a branch without an upstream", () => {
    expect(parseStatus("## feature")).toMatchObject({
      branch: "feature",
      upstream: undefined,
      ahead: 0,
      behind: 0,
    });
  });

  it("reads a repository with no commits yet", () => {
    expect(parseStatus("## No commits yet on main").branch).eq("main");
  });

  it("reads a detached HEAD as no branch", () => {
    expect(parseStatus("## HEAD (no branch)").branch).toBeNull();
  });

  it("reads each file's index and work tree status", () => {
    const { files } = parseStatus(STATUS);

    expect(files).toContainEqual({ path: "src/a.ts", index: " ", worktree: "M" });
    expect(files).toContainEqual({ path: "new.txt", index: "?", worktree: "?" });
    expect(files).toContainEqual({ path: "added.ts", index: "A", worktree: " " });
    expect(files).toContainEqual({ path: "gone.ts", index: " ", worktree: "D" });
  });

  it("reads renames with where they came from", () => {
    expect(parseStatus(STATUS).files).toContainEqual({
      path: "renamed.ts",
      from: "old.ts",
      index: "R",
      worktree: " ",
    });
  });

  it("unquotes paths with spaces", () => {
    expect(parseStatus(STATUS).files.map((f) => f.path)).toContain("with space.txt");
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
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
      cwd: root,
      stdio: "ignore",
    });
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
    expect(status.files).toEqual([{ path: "a.txt", index: " ", worktree: "M" }]);
  });

  it("the status line shows the branch", async () => {
    const root = repository();
    const ide = vim("|", { width: 100 });

    ide.setWorkspace(root);

    await vi.waitFor(() => expect(ide.statusLine()).toContain("main"));
  });
});
