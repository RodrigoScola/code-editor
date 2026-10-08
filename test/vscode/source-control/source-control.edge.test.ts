import { describe, expect, it } from "vitest";
import { parseStatusV2 } from "../../../src/Scm/status.js";
import { stageRanges } from "../../../src/Scm/stageRanges.js";
import { validateCommitMessage } from "../../../src/Scm/commitMessage.js";
import { validateBranchName } from "../../../src/Scm/branchNames.js";
import { parseStashList } from "../../../src/Scm/stash.js";
import { parseBlame, fromNow } from "../../../src/Scm/blame.js";
import { findConflicts, resolveConflict } from "../../../src/Scm/mergeConflicts.js";
import { MergeModel } from "../../../src/Scm/mergeEditor.js";
import { graphRows } from "../../../src/Scm/log.js";
import { Repository } from "../../../src/Scm/repository.js";
import { hasGit, repository } from "./git-helpers.js";

// Edge cases for source control (base specs: status, staging, commit,
// branches, stash, blame, merge-conflicts, merge-editor, graph).

describe("status", () => {
  it("copies (C) carry their original path like renames", () => {
    const status = parseStatusV2("2 C. N... 100644 100644 100644 a a C75 copy.ts\0orig.ts\0");

    expect(status.files[0]).toMatchObject({ path: "copy.ts", origPath: "orig.ts", index: "C" });
  });

  it("a path with a newline survives -z output", () => {
    expect(parseStatusV2("? weird\nname.txt\0").files[0].path).eq("weird\nname.txt");
  });

  it("only behind the upstream", () => {
    expect(parseStatusV2("# branch.oid abc\0# branch.head main\0# branch.upstream o/main\0# branch.ab +0 -3\0")).toMatchObject({
      ahead: 0,
      behind: 3,
    });
  });
});

describe("staging ranges", () => {
  it("a selection covering two changes stages both", () => {
    expect(stageRanges("a\nb\nc\n", "A\nb\nC\n", [{ start: 0, end: 2 }])).eq("A\nb\nC\n");
  });

  it("a selection touching part of a multi-line change stages all of it", () => {
    expect(stageRanges("a\nb\nc\n", "a\nX\nY\nc\n", [{ start: 1, end: 1 }])).eq("a\nX\nY\nc\n");
  });

  it("keeps CRLF line endings", () => {
    expect(stageRanges("a\r\nb\r\n", "a\r\nB\r\n", [{ start: 1, end: 1 }])).eq("a\r\nB\r\n");
  });
});

describe("commit messages", () => {
  it("comment lines starting with # are not checked", () => {
    expect(validateCommitMessage(`subject\n\n# ${"x".repeat(100)}`, {})).toEqual([]);
  });

  it("each long body line gets its own warning", () => {
    const long = "y".repeat(80);

    expect(validateCommitMessage(`subject\n\n${long}\n${long}`, {}).map((w: { line: number }) => w.line)).toEqual([2, 3]);
  });
});

describe("branch names", () => {
  it("a name ending in .lock in a middle part is refused", () => {
    expect(validateBranchName("a.lock/b")).not.toBeNull();
  });

  it("unicode names are fine", () => {
    expect(validateBranchName("café/ação")).toBeNull();
  });

  it("an empty name is refused", () => {
    expect(validateBranchName("")).not.toBeNull();
  });
});

describe("stash list", () => {
  it("a stash made on a detached HEAD", () => {
    expect(parseStashList("stash@{0}: WIP on (no branch): abc1234 msg")[0]).toMatchObject({
      branch: "(no branch)",
      description: "abc1234 msg",
    });
  });
});

describe("blame", () => {
  it("a file with one line and a boundary commit", () => {
    const hash = "c".repeat(40);
    const output = [
      `${hash} 1 1 1`,
      "author A",
      "author-mail <a@x>",
      "author-time 1",
      "author-tz +0000",
      "summary init",
      "boundary",
      "filename f",
      "\tonly line",
    ].join("\n");

    expect(parseBlame(output)).toHaveLength(1);
  });

  it("dates in the future still read as now", () => {
    expect(fromNow(Date.UTC(2024, 0, 2), Date.UTC(2024, 0, 1))).eq("now");
  });

  it("months and years", () => {
    const now = Date.UTC(2024, 6, 1);

    expect(fromNow(now - 62 * 86_400_000, now)).eq("2 mos ago");
    expect(fromNow(now - 800 * 86_400_000, now)).eq("2 yrs ago");
  });
});

describe("merge conflicts", () => {
  it("a conflict at the very end of the file without a final newline", () => {
    const text = "<<<<<<< a\nx\n=======\ny\n>>>>>>> b";

    expect(resolveConflict(text, 0, "incoming")).eq("y");
  });

  it("markers with only the marker and no label", () => {
    expect(findConflicts("<<<<<<<\nx\n=======\ny\n>>>>>>>")[0]).toMatchObject({
      current: { label: "", lines: ["x"] },
      incoming: { label: "", lines: ["y"] },
    });
  });

  it("a ======= line outside a conflict is plain text", () => {
    expect(findConflicts("title\n=======\ntext")).toEqual([]);
  });
});

describe("merge editor", () => {
  it("a deletion on one side and a change on the other is a conflict", () => {
    const model = new MergeModel("a\nb\nc", "a\nc", "a\nB\nc");

    expect(model.conflicts()).toHaveLength(1);
  });

  it("both sides adding the same line at the end is not a conflict", () => {
    const model = new MergeModel("a", "a\nb", "a\nb");

    expect(model.result()).eq("a\nb");
  });
});

describe("graph", () => {
  it("two branches from the same parent, both on screen", () => {
    const rows = graphRows([
      { hash: "x", parents: ["base"] },
      { hash: "y", parents: ["base"] },
      { hash: "base", parents: [] },
    ]);

    expect(rows.map((r: { column: number }) => r.column)).toEqual([0, 1, 0]);
  });
});

describe.skipIf(!hasGit())("in a real repository", () => {
  it("status of a file with spaces in its name", async () => {
    const { root, write } = repository();
    write("my file.txt", "x\n");

    const status = await new Repository(root).status();

    expect(status.files.map((f: { path: string }) => f.path)).toContain("my file.txt");
  });

  it("stage a file in a new folder", async () => {
    const { root, write } = repository();
    write("deep/er/a.txt", "x\n");
    const repo = new Repository(root);

    await repo.stage(["deep/er/a.txt"]);

    expect((await repo.status()).files).toContainEqual(expect.objectContaining({ path: "deep/er/a.txt", index: "A" }));
  });
});
