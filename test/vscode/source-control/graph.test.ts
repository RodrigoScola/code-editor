import { describe, expect, it } from "vitest";
import { graphRows, incomingOutgoing, parseLog } from "../../../src/Scm/log.js";
import { Repository } from "../../../src/Scm/repository.js";
import { hasGit, repository } from "./git-helpers.js";

// The Source Control Graph. Proposed src/Scm/log.ts:
//   parseLog(output) for `git log --format=%H%x00%P%x00%an%x00%ae%x00%at%x00%D%x00%B%x1e`
//     -> [{ hash, parents, authorName, authorEmail, authorDate (ms), refs,
//          subject, message }]   records end with \x1e, fields split by \0
//   graphRows(commits) -> [{ hash, column, lanes }] where column is the lane
//     the commit's dot is in. A branch's first parent continues in the same
//     lane; a merge's second parent opens a lane to its right; lanes close
//     when they reach a commit that is already placed.
//   incomingOutgoing(commits, head, upstream) -> { incoming, outgoing }
//     hashes reachable from upstream but not head, and the other way
// Repository: log({ maxCount, ref? }), cherryPick(hash).

const record = (fields: string[]) => fields.join("\0") + "\x1e";

describe("parseLog", () => {
  const output =
    record(["c3", "c2 b1", "Ana", "ana@x.com", "1700000300", "HEAD -> main, tag: v1", "Merge feature\n\nDetails"]) +
    "\n" +
    record(["c2", "c1", "Bo", "bo@x.com", "1700000200", "", "Second"]);

  it("reads each commit", () => {
    expect(parseLog(output)[0]).toEqual({
      hash: "c3",
      parents: ["c2", "b1"],
      authorName: "Ana",
      authorEmail: "ana@x.com",
      authorDate: 1700000300 * 1000,
      refs: ["HEAD -> main", "tag: v1"],
      subject: "Merge feature",
      message: "Merge feature\n\nDetails",
    });
  });

  it("a commit with no refs has an empty list", () => {
    expect(parseLog(output)[1].refs).toEqual([]);
  });

  it("the root commit has no parents", () => {
    expect(parseLog(record(["c1", "", "A", "a@x", "1", "", "init"]))[0].parents).toEqual([]);
  });
});

const commit = (hash: string, parents: string[]) => ({ hash, parents });

describe("graphRows", () => {
  it("keeps a straight history in one lane", () => {
    const rows = graphRows([commit("c3", ["c2"]), commit("c2", ["c1"]), commit("c1", [])]);

    expect(rows.map((r: { column: number }) => r.column)).toEqual([0, 0, 0]);
  });

  it("puts a merged branch in a second lane until it joins", () => {
    // c4 merges b2 into c3; b2 <- b1 <- c1
    const rows = graphRows([
      commit("c4", ["c3", "b2"]),
      commit("c3", ["c1"]),
      commit("b2", ["b1"]),
      commit("b1", ["c1"]),
      commit("c1", []),
    ]);

    expect(rows.map((r: { hash: string; column: number }) => [r.hash, r.column])).toEqual([
      ["c4", 0],
      ["c3", 0],
      ["b2", 1],
      ["b1", 1],
      ["c1", 0],
    ]);
  });
});

describe("incomingOutgoing", () => {
  it("finds commits on only one side", () => {
    const commits = [
      commit("local2", ["local1"]),
      commit("local1", ["base"]),
      commit("remote1", ["base"]),
      commit("base", []),
    ];

    expect(incomingOutgoing(commits, "local2", "remote1")).toEqual({
      incoming: ["remote1"],
      outgoing: ["local2", "local1"],
    });
  });

  it("is empty when the branches are the same", () => {
    expect(incomingOutgoing([commit("a", [])], "a", "a")).toEqual({ incoming: [], outgoing: [] });
  });
});

describe.skipIf(!hasGit())("in a real repository", () => {
  it("log lists commits newest first", async () => {
    const { root, git, write } = repository();
    write("a.txt", "two\n");
    git("commit", "-am", "second");

    const subjects = (await new Repository(root).log({ maxCount: 10 })).map((c: { subject: string }) => c.subject);

    expect(subjects).toEqual(["second", "first"]);
  });

  it("cherryPick applies a commit from another branch", async () => {
    const { root, git, write } = repository({ "a.txt": "one\n" });
    git("checkout", "-b", "other");
    write("b.txt", "picked\n");
    git("add", ".");
    git("commit", "-m", "to pick");
    const hash = git("rev-parse", "HEAD").trim();
    git("checkout", "main");

    await new Repository(root).cherryPick(hash);

    const [last] = await new Repository(root).log({ maxCount: 1 });
    expect(last.subject).eq("to pick");
  });
});
