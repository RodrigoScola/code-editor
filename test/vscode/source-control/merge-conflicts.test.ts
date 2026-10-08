import { describe, expect, it } from "vitest";
import { findConflicts, resolveAll, resolveConflict } from "../../../src/Scm/mergeConflicts.js";
import { code } from "../harness.js";

// Inline merge conflicts. Proposed src/Scm/mergeConflicts.ts:
//   findConflicts(text) -> [{ startLine, endLine, current: { label, lines },
//     base?: { label, lines }, incoming: { label, lines } }]
//     markers are exactly 7 characters at the start of a line:
//     <<<<<<< current, ||||||| base (diff3), =======, >>>>>>> incoming;
//     a conflict without all its markers is ignored
//   resolveConflict(text, index, "current" | "incoming" | "both") -> text
//   resolveAll(text, "current" | "incoming" | "both") -> text
// Line endings are kept as they are.
// Editor commands (cursor inside a conflict):
//   merge-conflict.accept.current / accept.incoming / accept.both
//   merge-conflict.accept.all-current / accept.all-incoming
//   merge-conflict.next / merge-conflict.previous

const conflict = [
  "top",
  "<<<<<<< HEAD",
  "ours",
  "=======",
  "theirs",
  ">>>>>>> feature",
  "bottom",
].join("\n");

describe("findConflicts", () => {
  it("finds a conflict with its labels and lines", () => {
    expect(findConflicts(conflict)).toEqual([
      {
        startLine: 1,
        endLine: 5,
        current: { label: "HEAD", lines: ["ours"] },
        incoming: { label: "feature", lines: ["theirs"] },
      },
    ]);
  });

  it("reads the base section of a diff3 conflict", () => {
    const diff3 = ["<<<<<<< HEAD", "ours", "||||||| base", "original", "=======", "theirs", ">>>>>>> b"].join("\n");

    expect(findConflicts(diff3)[0].base).toEqual({ label: "base", lines: ["original"] });
  });

  it("finds several conflicts", () => {
    expect(findConflicts(`${conflict}\n${conflict}`)).toHaveLength(2);
  });

  it("ignores a conflict that never ends", () => {
    expect(findConflicts("<<<<<<< HEAD\nours\n=======\ntheirs")).toEqual([]);
  });

  it("ignores markers that are not at the start of a line or not 7 long", () => {
    expect(findConflicts(" <<<<<<< HEAD\n<<<<<< x\n")).toEqual([]);
  });

  it("allows an empty side", () => {
    const text = "<<<<<<< HEAD\n=======\ntheirs\n>>>>>>> b";

    expect(findConflicts(text)[0].current.lines).toEqual([]);
  });
});

describe("resolving", () => {
  it("current keeps our side", () => {
    expect(resolveConflict(conflict, 0, "current")).eq("top\nours\nbottom");
  });

  it("incoming keeps their side", () => {
    expect(resolveConflict(conflict, 0, "incoming")).eq("top\ntheirs\nbottom");
  });

  it("both keeps ours then theirs", () => {
    expect(resolveConflict(conflict, 0, "both")).eq("top\nours\ntheirs\nbottom");
  });

  it("drops the base section too", () => {
    const diff3 = ["<<<<<<< HEAD", "ours", "||||||| base", "original", "=======", "theirs", ">>>>>>> b"].join("\n");

    expect(resolveConflict(diff3, 0, "both")).eq("ours\ntheirs");
  });

  it("resolveAll resolves every conflict the same way", () => {
    expect(resolveAll(`${conflict}\n${conflict}`, "incoming")).eq("top\ntheirs\nbottom\ntop\ntheirs\nbottom");
  });

  it("keeps Windows line endings", () => {
    expect(resolveConflict(conflict.replace(/\n/g, "\r\n"), 0, "current")).eq("top\r\nours\r\nbottom");
  });
});

describe("in the editor", () => {
  it("accept.current resolves the conflict at the cursor", () => {
    const vs = code(conflict.replace("ours", "o|urs"));

    expect(vs.run("merge-conflict.accept.current").lines()).toEqual(["top", "ours", "bottom"]);
  });

  it("accept.all-incoming resolves every conflict", () => {
    const vs = code(`|${conflict}\n${conflict}`);

    vs.run("merge-conflict.accept.all-incoming");

    expect(vs.lines()).toEqual(["top", "theirs", "bottom", "top", "theirs", "bottom"]);
  });

  it("next moves to the start of the next conflict", () => {
    const vs = code(`|${conflict}\n${conflict}`);

    expect(vs.run("merge-conflict.next").window().cursor().line).eq(1);
    expect(vs.run("merge-conflict.next").window().cursor().line).eq(8);
  });

  it("previous wraps around", () => {
    const vs = code(`|${conflict}\n${conflict}`);

    expect(vs.run("merge-conflict.previous").window().cursor().line).eq(8);
  });
});
