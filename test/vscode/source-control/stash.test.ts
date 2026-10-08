import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Repository } from "../../../src/Scm/repository.js";
import { parseStashList } from "../../../src/Scm/stash.js";
import { hasGit, repository } from "./git-helpers.js";

// Stashes. Proposed src/Scm/stash.ts:
//   parseStashList(output of `git stash list`) -> [{ index, branch,
//     description }] ("stash@{0}: On main: msg", "stash@{1}: WIP on main:
//     abc1234 subject")
// Repository: stash({ message?, includeUntracked?, staged? }), stashes(),
// applyStash(index), popStash(index), dropStash(index), dropAllStashes().
// Apply keeps the stash; pop removes it (unless it conflicts).

describe("parseStashList", () => {
  it("reads messages and work-in-progress entries", () => {
    expect(
      parseStashList("stash@{0}: On main: my message\nstash@{1}: WIP on feature: abc1234 last subject\n"),
    ).toEqual([
      { index: 0, branch: "main", description: "my message" },
      { index: 1, branch: "feature", description: "abc1234 last subject" },
    ]);
  });

  it("keeps colons in the message", () => {
    expect(parseStashList("stash@{0}: On main: fix: the thing")[0].description).eq("fix: the thing");
  });

  it("returns nothing for no stashes", () => {
    expect(parseStashList("")).toEqual([]);
  });
});

describe.skipIf(!hasGit())("in a real repository", () => {
  it("stash saves changes and cleans the work tree", async () => {
    const { root, write } = repository({ "a.txt": "one\n" });
    write("a.txt", "two\n");
    const repo = new Repository(root);

    await repo.stash({ message: "wip" });

    expect(readFileSync(join(root, "a.txt"), "utf8")).eq("one\n");
    expect((await repo.stashes())[0]).toMatchObject({ index: 0, description: "wip" });
  });

  it("untracked files stay unless includeUntracked", async () => {
    const { root, write } = repository();
    write("a.txt", "two\n");
    write("new.txt", "x\n");
    const repo = new Repository(root);

    await repo.stash({});
    expect(existsSync(join(root, "new.txt"))).eq(true);

    await repo.stash({ includeUntracked: true });
    expect(existsSync(join(root, "new.txt"))).eq(false);
  });

  it("apply keeps the stash, pop removes it", async () => {
    const { root, write } = repository();
    write("a.txt", "two\n");
    const repo = new Repository(root);
    await repo.stash({});

    await repo.applyStash(0);
    expect(await repo.stashes()).toHaveLength(1);

    await repo.discard(["a.txt"]);
    await repo.popStash(0);
    expect(await repo.stashes()).toHaveLength(0);
    expect(readFileSync(join(root, "a.txt"), "utf8")).eq("two\n");
  });

  it("drop and drop all", async () => {
    const { root, write } = repository();
    const repo = new Repository(root);
    write("a.txt", "two\n");
    await repo.stash({ message: "first" });
    write("a.txt", "three\n");
    await repo.stash({ message: "second" });

    await repo.dropStash(0);
    expect((await repo.stashes()).map((s: { description: string }) => s.description)).toEqual(["first"]);

    await repo.dropAllStashes();
    expect(await repo.stashes()).toEqual([]);
  });

  it("a pop that conflicts keeps the stash", async () => {
    const { root, git, write } = repository({ "a.txt": "one\n" });
    const repo = new Repository(root);
    write("a.txt", "stashed\n");
    await repo.stash({});
    write("a.txt", "committed\n");
    git("commit", "-am", "conflicting");

    await repo.popStash(0).catch(() => {});

    expect(await repo.stashes()).toHaveLength(1);
  });
});
