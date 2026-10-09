import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Repository } from "../../../src/Scm/repository.js";
import { parseWorktreeList } from "../../../src/Scm/worktrees.js";
import { workspace } from "../harness.js";
import { hasGit, repository } from "./git-helpers.js";

// Tags and worktrees.
// Proposed src/Scm/worktrees.ts:
//   parseWorktreeList(output of `git worktree list --porcelain`)
//     -> [{ path, head, branch?, detached, locked, bare }]
// Repository: tags(), createTag(name, { message?, ref? }) (a message makes
// an annotated tag), deleteTag(name), worktrees(), addWorktree(path,
// { branch, newBranch? }), removeWorktree(path, { force? }) (refuses a
// worktree with changes unless forced).

describe("parseWorktreeList", () => {
  const output = [
    "worktree /repo",
    "HEAD 1111111111111111111111111111111111111111",
    "branch refs/heads/main",
    "",
    "worktree /repo-feature",
    "HEAD 2222222222222222222222222222222222222222",
    "branch refs/heads/feature",
    "locked",
    "",
    "worktree /repo-detached",
    "HEAD 3333333333333333333333333333333333333333",
    "detached",
    "",
  ].join("\n");

  it("reads each worktree", () => {
    expect(parseWorktreeList(output)).toEqual([
      { path: "/repo", head: "1111111111111111111111111111111111111111", branch: "main", detached: false, locked: false, bare: false },
      { path: "/repo-feature", head: "2222222222222222222222222222222222222222", branch: "feature", detached: false, locked: true, bare: false },
      { path: "/repo-detached", head: "3333333333333333333333333333333333333333", branch: undefined, detached: true, locked: false, bare: false },
    ]);
  });

  it("reads a bare repository", () => {
    expect(parseWorktreeList("worktree /bare.git\nbare\n")[0]).toMatchObject({ path: "/bare.git", bare: true });
  });
});

describe.skipIf(!hasGit())("tags in a real repository", () => {
  it("creates, lists and deletes tags", async () => {
    const { root } = repository();
    const repo = new Repository(root);

    await repo.createTag("v1");
    await repo.createTag("v2", { message: "Release 2" });
    expect((await repo.tags()).map((t: { name: string }) => t.name)).toEqual(["v1", "v2"]);

    await repo.deleteTag("v1");
    expect((await repo.tags()).map((t: { name: string }) => t.name)).toEqual(["v2"]);
  });

  it("an annotated tag keeps its message", async () => {
    const { root } = repository();
    const repo = new Repository(root);

    await repo.createTag("v2", { message: "Release 2" });

    expect((await repo.tags())[0]).toMatchObject({ name: "v2", annotated: true, message: "Release 2" });
  });
});

describe.skipIf(!hasGit())("worktrees in a real repository", () => {
  it("adds and lists a worktree with a new branch", async () => {
    const { root } = repository();
    const repo = new Repository(root);
    const path = join(workspace({}), "wt");

    await repo.addWorktree(path, { newBranch: "feature" });

    const worktrees = await repo.worktrees();
    expect(worktrees).toHaveLength(2);
    expect(worktrees[1]).toMatchObject({ branch: "feature" });
    expect(existsSync(join(path, "a.txt"))).eq(true);
  });

  it("refuses to remove a worktree with changes unless forced", async () => {
    const { root } = repository();
    const repo = new Repository(root);
    const path = join(workspace({}), "wt");
    await repo.addWorktree(path, { newBranch: "feature" });
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(path, "a.txt"), "dirty\n");

    await expect(repo.removeWorktree(path)).rejects.toThrow();

    await repo.removeWorktree(path, { force: true });
    expect(await repo.worktrees()).toHaveLength(1);
  });
});
