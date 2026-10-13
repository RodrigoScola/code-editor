import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { code, workspace } from "../harness.js";
import { hasGit, repository } from "./git-helpers.js";

// Git from inside the editor: the commands a user runs on the open file and
// the repository of the workspace. The Repository specs next to this file
// cover the git calls themselves; these cover the editor side, so each one
// runs a command and checks both the repository and what the editor shows.
//
// Commands (registered in ctx.commands, VS Code name in brackets):
//   git.stageFile        stage the active file          (git.stage)
//   git.unstageFile      unstage the active file        (git.unstage)
//   git.discardFile      throw away the active file's changes, the editor
//                        reloads the file               (git.clean)
//   git.commit           { message } commit what is staged (git.commit)
//   git.commitAll        { message } stage every tracked change and commit
//                        (git.commitAll)
//   git.checkout         { branch } switch branches     (git.checkout)
//   git.createBranch     { name, from? } create a branch and switch to it
//                        (git.branch)
//   git.openChange       diff of HEAD (left) against the editor's text
//                        (right), read with ctx.diffEditor() as in
//                        test/ide/diff/diff-editor.test.ts (git.openChange)
//   git.refresh          read the status again           (git.refresh)
//
// Git runs asynchronously, so the specs wait with vi.waitFor. Errors from
// git (nothing to commit, a checkout that would lose changes, a bad branch
// name) are shown with ctx.notify (test/ide/tools/notifications.test.ts) and
// read back with ctx.messages(); the repository is left as it was.

function opened(files: Record<string, string> = { "a.txt": "one\n" }) {
  const repo = repository(files);
  const ide = code("|", { width: 100, height: 20 });
  ide.setWorkspace(repo.root);
  ide.openAndFocus(join(repo.root, Object.keys(files)[0]));
  const status = () => repo.git("status", "--porcelain=v1").trimEnd();
  const branch = () => repo.git("branch", "--show-current").trim();
  const subjects = () => repo.git("log", "--format=%s").trim().split("\n");
  return { ...repo, ide, status, branch, subjects };
}

const lastMessage = (ide: ReturnType<typeof code>) =>
  ide.messages().at(-1)?.message ?? "";

describe.skipIf(!hasGit())("git commands", () => {
  describe("staging the open file", () => {
    it("stageFile stages the saved changes of the active file", async () => {
      const { ide, write, status } = opened();
      write("a.txt", "two\n");

      ide.executeCommand("git.stageFile");

      await vi.waitFor(() => expect(status()).eq("M  a.txt"));
    });

    it("stageFile saves a modified editor first", async () => {
      const { ide, root, status } = opened();
      ide.keys("inew <Esc>");

      ide.executeCommand("git.stageFile");

      await vi.waitFor(() => expect(status()).eq("M  a.txt"));
      expect(readFileSync(join(root, "a.txt"), "utf8")).eq("new one\n");
    });

    it("stageFile adds an untracked file", async () => {
      const { ide, root, write, status } = opened();
      write("new.txt", "fresh\n");
      ide.openAndFocus(join(root, "new.txt"));

      ide.executeCommand("git.stageFile");

      await vi.waitFor(() => expect(status()).eq("A  new.txt"));
    });

    it("unstageFile puts the change back in the work tree", async () => {
      const { ide, git, write, status } = opened();
      write("a.txt", "two\n");
      git("add", "a.txt");

      ide.executeCommand("git.unstageFile");

      await vi.waitFor(() => expect(status()).eq(" M a.txt"));
    });

    it("discardFile restores the file and the editor shows it", async () => {
      const { ide, status } = opened();
      ide.keys("ichanged <Esc>:w<CR>");
      expect(ide.lines()[0]).eq("changed one");

      ide.executeCommand("git.discardFile");

      await vi.waitFor(() => expect(status()).eq(""));
      await vi.waitFor(() => expect(ide.lines()[0]).eq("one"));
    });
  });

  describe("committing", () => {
    it("commit records what is staged", async () => {
      const { ide, git, write, status, subjects } = opened();
      write("a.txt", "two\n");
      git("add", "a.txt");

      ide.executeCommand("git.commit", { message: "Second" });

      await vi.waitFor(() => expect(subjects()).toEqual(["Second", "first"]));
      expect(status()).eq("");
    });

    it("commit leaves unstaged changes alone", async () => {
      const { ide, git, write, status, subjects } = opened({
        "a.txt": "one\n",
        "b.txt": "one\n",
      });
      write("a.txt", "two\n");
      write("b.txt", "two\n");
      git("add", "a.txt");

      ide.executeCommand("git.commit", { message: "only a" });

      await vi.waitFor(() => expect(subjects()[0]).eq("only a"));
      expect(status()).eq(" M b.txt");
    });

    it("commit with nothing staged tells you and commits nothing", async () => {
      const { ide, subjects } = opened();

      ide.executeCommand("git.commit", { message: "empty" });

      await vi.waitFor(() => expect(lastMessage(ide)).toMatch(/nothing to commit/i));
      expect(subjects()).toEqual(["first"]);
    });

    it("commit refuses an empty message", async () => {
      const { ide, git, write, subjects } = opened();
      write("a.txt", "two\n");
      git("add", "a.txt");

      ide.executeCommand("git.commit", { message: "  " });

      await vi.waitFor(() => expect(lastMessage(ide)).toMatch(/message/i));
      expect(subjects()).toEqual(["first"]);
    });

    it("commitAll stages tracked changes and commits them", async () => {
      const { ide, write, status, subjects } = opened();
      write("a.txt", "two\n");
      write("untracked.txt", "x\n");

      ide.executeCommand("git.commitAll", { message: "all" });

      await vi.waitFor(() => expect(subjects()[0]).eq("all"));
      expect(status()).eq("?? untracked.txt");
    });

    it("commitAll saves modified editors first", async () => {
      const { ide, root, subjects } = opened();
      ide.keys("iedited <Esc>");

      ide.executeCommand("git.commitAll", { message: "saved" });

      await vi.waitFor(() => expect(subjects()[0]).eq("saved"));
      expect(readFileSync(join(root, "a.txt"), "utf8")).eq("edited one\n");
    });
  });

  describe("branches", () => {
    it("createBranch creates a branch and switches to it", async () => {
      const { ide, branch } = opened();

      ide.executeCommand("git.createBranch", { name: "feature" });

      await vi.waitFor(() => expect(branch()).eq("feature"));
    });

    it("createBranch refuses a name git refuses", async () => {
      const { ide, git, branch } = opened();

      ide.executeCommand("git.createBranch", { name: "bad..name" });

      await vi.waitFor(() => expect(lastMessage(ide)).toMatch(/branch name/i));
      expect(branch()).eq("main");
      expect(git("branch", "--list").trim()).eq("* main");
    });

    it("createBranch from another ref starts there", async () => {
      const { ide, git, write } = opened();
      write("a.txt", "two\n");
      git("commit", "-am", "second");
      const first = git("rev-parse", "HEAD~1").trim();

      ide.executeCommand("git.createBranch", { name: "old", from: first });

      await vi.waitFor(() => expect(git("rev-parse", "HEAD").trim()).eq(first));
    });

    it("checkout switches branches", async () => {
      const { ide, git, branch } = opened();
      git("branch", "other");

      ide.executeCommand("git.checkout", { branch: "other" });

      await vi.waitFor(() => expect(branch()).eq("other"));
    });

    it("the status line follows the branch", async () => {
      const { ide, git } = opened();
      git("branch", "other");
      await vi.waitFor(() => expect(ide.statusLine()).toContain("main"));

      ide.executeCommand("git.checkout", { branch: "other" });

      await vi.waitFor(() => expect(ide.statusLine()).toContain("other"));
    });

    it("open files show the other branch's content", async () => {
      const { ide, git, write } = opened();
      git("checkout", "-b", "other");
      write("a.txt", "on other\n");
      git("commit", "-am", "other");
      git("checkout", "main");
      ide.executeCommand("git.refresh");

      ide.executeCommand("git.checkout", { branch: "other" });

      await vi.waitFor(() => expect(ide.lines()[0]).eq("on other"));
    });

    it("refuses to switch with unsaved changes in an editor", async () => {
      const { ide, git, branch } = opened();
      git("branch", "other");
      ide.keys("iunsaved <Esc>");

      ide.executeCommand("git.checkout", { branch: "other" });

      await vi.waitFor(() => expect(lastMessage(ide)).toMatch(/unsaved/i));
      expect(branch()).eq("main");
      expect(ide.lines()[0]).eq("unsaved one");
    });

    it("reports git's error when the switch would overwrite changes", async () => {
      const { ide, git, write, branch } = opened();
      git("checkout", "-b", "other");
      write("a.txt", "theirs\n");
      git("commit", "-am", "other");
      git("checkout", "main");
      write("a.txt", "mine\n");

      ide.executeCommand("git.checkout", { branch: "other" });

      await vi.waitFor(() => expect(lastMessage(ide)).toMatch(/overwritten/i));
      expect(branch()).eq("main");
    });

    it("an unknown branch is an error, not a new branch", async () => {
      const { ide, branch } = opened();

      ide.executeCommand("git.checkout", { branch: "nope" });

      await vi.waitFor(() => expect(lastMessage(ide)).toMatch(/nope/));
      expect(branch()).eq("main");
    });
  });

  describe("seeing changes", () => {
    it("openChange compares HEAD with the editor's text", async () => {
      const { ide } = opened();
      ide.keys("inew <Esc>");

      ide.executeCommand("git.openChange");

      await vi.waitFor(() =>
        expect(ide.diffEditor()).toMatchObject({
          original: "one\n",
          modified: "new one\n",
        }),
      );
    });

    it("openChange on a new file compares with nothing", async () => {
      const { ide, root, write } = opened();
      write("new.txt", "fresh\n");
      ide.openAndFocus(join(root, "new.txt"));

      ide.executeCommand("git.openChange");

      await vi.waitFor(() =>
        expect(ide.diffEditor()).toMatchObject({ original: "", modified: "fresh\n" }),
      );
    });
  });

  it("a workspace that isn't a repository has no branch, and doesn't throw", () => {
    const ide = code("|", { width: 100 });

    // gitStatus runs `git status` here; outside a repository git exits with
    // 128 ("not a git repository"), which must not escape to the editor
    expect(() => ide.setWorkspace(workspace({ "a.txt": "x" }))).not.toThrow();
    expect(() => ide.statusLine()).not.toThrow();
    expect(ide.git()).toBeNull();
  });

  it("every git command needs a workspace that is a repository", async () => {
    const ide = code("|");

    ide.executeCommand("git.commit", { message: "x" });

    await vi.waitFor(() =>
      expect(lastMessage(ide)).toMatch(/not a git repository|no workspace/i),
    );
  });
});
