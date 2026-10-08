import { describe, expect, it } from "vitest";
import { fromNow, parseBlame, parseCoAuthors, renderBlame } from "../../../src/Scm/blame.js";
import { Repository } from "../../../src/Scm/repository.js";
import { hasGit, repository } from "./git-helpers.js";

// Git blame (inline at the cursor line and in the status bar).
// Proposed src/Scm/blame.ts:
//   parseBlame(output of `git blame --porcelain`) -> one entry per line:
//     { line, hash, authorName, authorEmail, authorTime (ms), summary,
//       uncommitted }   headers are given once per commit; later lines of
//       the same commit only repeat the hash line
//   renderBlame(template, entry, now) with ${subject} ${authorName}
//     ${authorEmail} ${authorDateAgo} ${hash} ${hashShort} (7 characters)
//     (git.blame.editorDecoration.template, statusBarItem.template)
//   fromNow(time, now) -> "now", "5 mins ago", "3 hrs ago", "2 days ago", ...
//   parseCoAuthors(message) -> Co-authored-by trailers
// Repository: blame(path, { ignoreWhitespace? }).

const A = "a".repeat(40);
const B = "b".repeat(40);
const ZERO = "0".repeat(40);

const porcelain = [
  `${A} 1 1 2`,
  "author Ana Lima",
  "author-mail <ana@x.com>",
  "author-time 1700000000",
  "author-tz +0000",
  "committer Ana Lima",
  "committer-mail <ana@x.com>",
  "committer-time 1700000000",
  "committer-tz +0000",
  "summary Add parser",
  "boundary",
  "filename a.ts",
  "\tline one",
  `${A} 2 2`,
  "\tline two",
  `${B} 3 3 1`,
  "author Bo",
  "author-mail <bo@x.com>",
  "author-time 1700086400",
  "author-tz +0000",
  "committer Bo",
  "committer-mail <bo@x.com>",
  "committer-time 1700086400",
  "committer-tz +0000",
  "summary Fix it",
  `previous ${A} a.ts`,
  "filename a.ts",
  "\tline three",
  `${ZERO} 4 4 1`,
  "author Not Committed Yet",
  "author-mail <not.committed.yet>",
  "author-time 1700090000",
  "author-tz +0000",
  "committer Not Committed Yet",
  "committer-mail <not.committed.yet>",
  "committer-time 1700090000",
  "committer-tz +0000",
  "summary Version of a.ts from a.ts",
  "filename a.ts",
  "\tline four",
].join("\n");

describe("parseBlame", () => {
  const lines = parseBlame(porcelain);

  it("has one entry per line", () => {
    expect(lines.map((l: { line: number }) => l.line)).toEqual([0, 1, 2, 3]);
  });

  it("reads the commit details", () => {
    expect(lines[0]).toMatchObject({
      hash: A,
      authorName: "Ana Lima",
      authorEmail: "ana@x.com",
      authorTime: 1700000000 * 1000,
      summary: "Add parser",
      uncommitted: false,
    });
  });

  it("reuses the details for later lines of the same commit", () => {
    expect(lines[1]).toMatchObject({ hash: A, authorName: "Ana Lima", summary: "Add parser" });
  });

  it("marks lines that are not committed yet", () => {
    expect(lines[3].uncommitted).eq(true);
  });
});

describe("renderBlame", () => {
  const entry = {
    hash: A,
    authorName: "Ana Lima",
    authorEmail: "ana@x.com",
    authorTime: Date.UTC(2024, 0, 1),
    summary: "Add parser",
  };
  const now = Date.UTC(2024, 0, 3);

  it("fills in the template", () => {
    expect(renderBlame("${subject}, ${authorName} (${authorDateAgo})", entry, now)).eq(
      "Add parser, Ana Lima (2 days ago)",
    );
  });

  it("knows the hash and the short hash", () => {
    expect(renderBlame("${hashShort} ${authorEmail}", entry, now)).eq("aaaaaaa ana@x.com");
  });
});

describe("fromNow", () => {
  const now = Date.UTC(2024, 0, 10, 12);

  it("just now", () => {
    expect(fromNow(now - 10_000, now)).eq("now");
  });

  it("minutes, hours and days", () => {
    expect(fromNow(now - 5 * 60_000, now)).eq("5 mins ago");
    expect(fromNow(now - 3 * 3_600_000, now)).eq("3 hrs ago");
    expect(fromNow(now - 2 * 86_400_000, now)).eq("2 days ago");
  });

  it("one of something is singular", () => {
    expect(fromNow(now - 86_400_000, now)).eq("1 day ago");
  });
});

describe("parseCoAuthors", () => {
  it("reads Co-authored-by trailers", () => {
    expect(
      parseCoAuthors("Fix\n\nCo-authored-by: Bo <bo@x.com>\nCo-authored-by: Cy <cy@x.com>"),
    ).toEqual([
      { name: "Bo", email: "bo@x.com" },
      { name: "Cy", email: "cy@x.com" },
    ]);
  });
});

describe.skipIf(!hasGit())("in a real repository", () => {
  it("blames each line", async () => {
    const { root, git, write } = repository({ "a.txt": "one\n" });
    write("a.txt", "one\ntwo\n");
    git("commit", "-am", "add two");

    const lines = await new Repository(root).blame("a.txt");

    expect(lines.map((l: { summary: string }) => l.summary)).toEqual(["first", "add two"]);
    expect(lines[0].authorName).eq("Test User");
  });
});
