import { describe, expect, it } from "vitest";
import { CommitInputHistory, validateCommitMessage } from "../../../src/Scm/commitMessage.js";
import { Repository } from "../../../src/Scm/repository.js";
import { hasGit, repository } from "./git-helpers.js";

// Committing. Proposed src/Scm/commitMessage.ts:
//   validateCommitMessage(message, { subjectLength = 50, length = 72 })
//     -> [{ line, severity: "warning", message }] e.g.
//     "8 characters over 50 in current line" (git.inputValidation)
//   new CommitInputHistory() with add(message), previous(), next()
//     (Up/Down in the commit box)
// Repository: commit(message, { amend?, all?, signoff?, allowEmpty? }),
// undoLastCommit() (soft reset: the changes stay staged), log({ maxCount }).
// Smart commit (git.enableSmartCommit): committing with nothing staged
// commits all changes to tracked files (or all, with
// git.smartCommitChanges "all").

describe("validateCommitMessage", () => {
  it("accepts a short subject", () => {
    expect(validateCommitMessage("Fix the bug", {})).toEqual([]);
  });

  it("warns when the subject is longer than 50", () => {
    const [warning] = validateCommitMessage("x".repeat(58), {});

    expect(warning).toMatchObject({ line: 0, severity: "warning" });
    expect(warning.message).toContain("8 characters over 50");
  });

  it("warns when a body line is longer than 72", () => {
    const [warning] = validateCommitMessage(`subject\n\n${"y".repeat(75)}`, {});

    expect(warning.line).eq(2);
    expect(warning.message).toContain("3 characters over 72");
  });

  it("uses the configured lengths", () => {
    expect(validateCommitMessage("x".repeat(30), { subjectLength: 20 })).toHaveLength(1);
  });
});

describe("CommitInputHistory", () => {
  it("goes back through earlier messages and forward again", () => {
    const history = new CommitInputHistory();
    history.add("first");
    history.add("second");

    expect(history.previous()).eq("second");
    expect(history.previous()).eq("first");
    expect(history.next()).eq("second");
  });

  it("stops at the oldest message", () => {
    const history = new CommitInputHistory();
    history.add("only");

    history.previous();

    expect(history.previous()).eq("only");
  });
});

describe.skipIf(!hasGit())("committing in a real repository", () => {
  it("commits what is staged", async () => {
    const { root, write } = repository();
    write("a.txt", "two\n");
    const repo = new Repository(root);
    await repo.stage(["a.txt"]);

    await repo.commit("Second commit");

    const [last] = await repo.log({ maxCount: 1 });
    expect(last.subject).eq("Second commit");
    expect((await repo.status()).files).toEqual([]);
  });

  it("refuses an empty message", async () => {
    const { root, write } = repository();
    write("a.txt", "two\n");
    const repo = new Repository(root);
    await repo.stage(["a.txt"]);

    await expect(repo.commit("   ")).rejects.toThrow();
  });

  it("amend rewrites the last commit", async () => {
    const { root } = repository();
    const repo = new Repository(root);

    await repo.commit("better message", { amend: true, allowEmpty: true });

    const commits = await repo.log({ maxCount: 5 });
    expect(commits).toHaveLength(1);
    expect(commits[0].subject).eq("better message");
  });

  it("all commits every tracked change without staging", async () => {
    const { root, write } = repository();
    write("a.txt", "two\n");
    const repo = new Repository(root);

    await repo.commit("all of it", { all: true });

    expect((await repo.status()).files).toEqual([]);
  });

  it("signoff adds a Signed-off-by trailer", async () => {
    const { root, write } = repository();
    write("a.txt", "two\n");
    const repo = new Repository(root);

    await repo.commit("signed", { all: true, signoff: true });

    const [last] = await repo.log({ maxCount: 1 });
    expect(last.message).toContain("Signed-off-by: Test User <test@example.com>");
  });

  it("undoLastCommit keeps the changes staged", async () => {
    const { root, write } = repository();
    write("a.txt", "two\n");
    const repo = new Repository(root);
    await repo.commit("to undo", { all: true });

    await repo.undoLastCommit();

    expect((await repo.log({ maxCount: 5 })).map((c: { subject: string }) => c.subject)).toEqual(["first"]);
    expect((await repo.status()).files).toContainEqual(expect.objectContaining({ path: "a.txt", index: "M" }));
  });
});
