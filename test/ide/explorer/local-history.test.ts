import { describe, expect, it } from "vitest";
import { LocalHistory, mergeTimeline } from "../../../src/Workspace/localHistory.js";

// Proposed module src/Workspace/localHistory.ts (Timeline > Local History).
//   new LocalHistory({ maxEntries = 50, maxFileSize = 256 * 1024,
//                      mergeWindow = 10 (seconds), exclude = {} globs,
//                      clock })
//   history.add(path, content, source = "File Saved")
//     an entry within mergeWindow of the previous one from the same source
//     replaces it; files bigger than maxFileSize and excluded paths are
//     skipped; past maxEntries the oldest go
//   history.entries(path) -> newest first [{ id, timestamp, source, label }]
//   history.content(id) / history.rename(id, label) / history.remove(id)
//   history.files() -> paths with history (Find Entry to Restore)
//   mergeTimeline(local, gitCommits) -> one list, newest first

function clocked() {
  let now = new Date(2024, 0, 1, 12, 0, 0).getTime();
  return {
    clock: () => now,
    advance: (seconds: number) => (now += seconds * 1000),
  };
}

describe("LocalHistory", () => {
  it("records a save", () => {
    const { clock } = clocked();
    const history = new LocalHistory({ clock });

    history.add("/p/a.ts", "v1");

    const [entry] = history.entries("/p/a.ts");
    expect(entry.source).eq("File Saved");
    expect(history.content(entry.id)).eq("v1");
  });

  it("lists newest first", () => {
    const { clock, advance } = clocked();
    const history = new LocalHistory({ clock });
    history.add("/p/a.ts", "v1");
    advance(60);
    history.add("/p/a.ts", "v2");

    expect(history.entries("/p/a.ts").map((e: { id: string }) => history.content(e.id))).toEqual(["v2", "v1"]);
  });

  it("replaces the last entry inside the merge window", () => {
    const { clock, advance } = clocked();
    const history = new LocalHistory({ clock, mergeWindow: 10 });
    history.add("/p/a.ts", "v1");
    advance(5);
    history.add("/p/a.ts", "v2");

    const entries = history.entries("/p/a.ts");
    expect(entries).toHaveLength(1);
    expect(history.content(entries[0].id)).eq("v2");
  });

  it("keeps at most maxEntries", () => {
    const { clock, advance } = clocked();
    const history = new LocalHistory({ clock, maxEntries: 2 });
    for (const v of ["v1", "v2", "v3"]) {
      history.add("/p/a.ts", v);
      advance(60);
    }

    expect(history.entries("/p/a.ts").map((e: { id: string }) => history.content(e.id))).toEqual(["v3", "v2"]);
  });

  it("skips files over maxFileSize", () => {
    const { clock } = clocked();
    const history = new LocalHistory({ clock, maxFileSize: 4 });

    history.add("/p/a.ts", "too big");

    expect(history.entries("/p/a.ts")).toEqual([]);
  });

  it("skips excluded paths", () => {
    const { clock } = clocked();
    const history = new LocalHistory({ clock, exclude: { "**/secrets/**": true } });

    history.add("/p/secrets/key.txt", "x");

    expect(history.files()).toEqual([]);
  });

  it("renames and removes entries", () => {
    const { clock } = clocked();
    const history = new LocalHistory({ clock });
    history.add("/p/a.ts", "v1");
    const [entry] = history.entries("/p/a.ts");

    history.rename(entry.id, "before refactor");
    expect(history.entries("/p/a.ts")[0].label).eq("before refactor");

    history.remove(entry.id);
    expect(history.entries("/p/a.ts")).toEqual([]);
  });

  it("lists every file with history", () => {
    const { clock } = clocked();
    const history = new LocalHistory({ clock });
    history.add("/p/b.ts", "x");
    history.add("/p/a.ts", "y");

    expect(history.files().sort()).toEqual(["/p/a.ts", "/p/b.ts"]);
  });
});

describe("mergeTimeline", () => {
  it("merges local saves and git commits by time, newest first", () => {
    const local = [{ id: "l1", timestamp: 300, source: "File Saved" }];
    const commits = [
      { id: "c1", timestamp: 400, source: "Git", label: "fix" },
      { id: "c2", timestamp: 100, source: "Git", label: "init" },
    ];

    expect(mergeTimeline(local, commits).map((e: { id: string }) => e.id)).toEqual(["c1", "l1", "c2"]);
  });
});
