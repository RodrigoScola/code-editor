import { describe, expect, it } from "vitest";
import {
  randomBranchName,
  sanitizeBranchName,
  sortBranches,
  validateBranchName,
} from "../../../src/Scm/branchNames.js";
import { Repository } from "../../../src/Scm/repository.js";
import { hasGit, repository } from "./git-helpers.js";

// Branches. Proposed src/Scm/branchNames.ts:
//   sanitizeBranchName(name, { whitespaceChar = "-", prefix = "" })
//     spaces become git.branchWhitespaceChar, git.branchPrefix is added
//   validateBranchName(name) -> null or a message; git's ref name rules:
//     no "..", no ~ ^ : ? * [ \ or control characters, no "@{", not "@",
//     no leading "-", no "//", no part starting with ".", no trailing "/",
//     ".", or ".lock"
//   randomBranchName(dictionaries, { separator, random }) (git.branchRandomName)
//   sortBranches(branches, "committerdate" | "alphabetically")
// Repository: branches(), currentBranch(), createBranch(name, { from?,
// checkout? }), checkout(ref), renameBranch(newName), deleteBranch(name,
// { force? }), merge(branch), abortMerge().

describe("sanitizeBranchName", () => {
  it("replaces spaces", () => {
    expect(sanitizeBranchName("my new feature", {})).eq("my-new-feature");
  });

  it("uses the configured whitespace character", () => {
    expect(sanitizeBranchName("my feature", { whitespaceChar: "_" })).eq("my_feature");
  });

  it("adds the prefix", () => {
    expect(sanitizeBranchName("login", { prefix: "feature/" })).eq("feature/login");
  });
});

describe("validateBranchName", () => {
  it("accepts normal names", () => {
    for (const ok of ["main", "feature/login", "fix-123", "v1.2"]) {
      expect(validateBranchName(ok), ok).toBeNull();
    }
  });

  it("refuses names git refuses", () => {
    for (const bad of [
      "a..b",
      "a~b",
      "a^b",
      "a:b",
      "a?b",
      "a*b",
      "a[b",
      "a\\b",
      "a b",
      "-start",
      "end/",
      "end.",
      "name.lock",
      "a@{b",
      "@",
      "a//b",
      "a/.hidden",
    ]) {
      expect(validateBranchName(bad), bad).not.toBeNull();
    }
  });
});

describe("randomBranchName", () => {
  it("joins one word from each dictionary", () => {
    const name = randomBranchName([["brave"], ["otter"]], { separator: "-", random: () => 0 });

    expect(name).eq("brave-otter");
  });

  it("picks with the random source", () => {
    const name = randomBranchName([["a", "b"], ["c", "d"]], { separator: "-", random: () => 0.99 });

    expect(name).eq("b-d");
  });
});

describe("sortBranches", () => {
  const branches = [
    { name: "beta", committerDate: 100 },
    { name: "alpha", committerDate: 300 },
    { name: "gamma", committerDate: 200 },
  ];

  it("by most recent commit", () => {
    expect(sortBranches(branches, "committerdate").map((b: { name: string }) => b.name)).toEqual([
      "alpha",
      "gamma",
      "beta",
    ]);
  });

  it("alphabetically", () => {
    expect(sortBranches(branches, "alphabetically").map((b: { name: string }) => b.name)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });
});

describe.skipIf(!hasGit())("in a real repository", () => {
  it("creates, lists and checks out a branch", async () => {
    const { root } = repository();
    const repo = new Repository(root);

    await repo.createBranch("dev", { checkout: true });

    expect(await repo.currentBranch()).eq("dev");
    expect((await repo.branches()).map((b: { name: string }) => b.name).sort()).toEqual(["dev", "main"]);
  });

  it("creates a branch from another ref without switching", async () => {
    const { root } = repository();
    const repo = new Repository(root);

    await repo.createBranch("from-main", { from: "main", checkout: false });

    expect(await repo.currentBranch()).eq("main");
  });

  it("renames the current branch", async () => {
    const { root } = repository();
    const repo = new Repository(root);

    await repo.renameBranch("trunk");

    expect(await repo.currentBranch()).eq("trunk");
  });

  it("refuses to delete the current branch", async () => {
    const { root } = repository();

    await expect(new Repository(root).deleteBranch("main")).rejects.toThrow();
  });

  it("deletes another branch", async () => {
    const { root } = repository();
    const repo = new Repository(root);
    await repo.createBranch("old", { checkout: false });

    await repo.deleteBranch("old");

    expect((await repo.branches()).map((b: { name: string }) => b.name)).toEqual(["main"]);
  });

  it("checking out a commit detaches HEAD", async () => {
    const { root, git } = repository();
    const sha = git("rev-parse", "HEAD").trim();
    const repo = new Repository(root);

    await repo.checkout(sha);

    expect((await repo.status()).detached).eq(true);
  });

  it("abortMerge goes back to before a conflicting merge", async () => {
    const { root, git, write } = repository({ "a.txt": "base\n" });
    git("checkout", "-b", "other");
    write("a.txt", "theirs\n");
    git("commit", "-am", "theirs");
    git("checkout", "main");
    write("a.txt", "ours\n");
    git("commit", "-am", "ours");
    const repo = new Repository(root);

    await repo.merge("other").catch(() => {});
    await repo.abortMerge();

    expect((await repo.status()).files).toEqual([]);
  });
});
