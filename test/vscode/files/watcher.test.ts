import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { coalesceEvents, filterEvents } from "../../../src/Files/watcher.js";
import { workspace } from "../../ide/harness.js";
import { code } from "../harness.js";

// Proposed module src/Files/watcher.ts. File system watchers report bursts
// of raw events; VS Code merges them before anything reacts.
//   coalesceEvents(events) -> events, in order of first appearance
//     added + deleted     -> nothing
//     deleted + added     -> changed
//     added + changed     -> added
//     changed + changed   -> one changed
//     a deleted folder swallows the events for everything inside it
//   filterEvents(events, excludeGlobs) drops events under
//     files.watcherExclude patterns
// event: { type: "added" | "changed" | "deleted", path }
//
// The editor reacts through ctx.handleFileEvents(events):
//   an unmodified editor whose file changed is reloaded
//   a modified one is left alone (it will conflict on save)
//   an editor whose file was deleted is marked deleted

type Type = "added" | "changed" | "deleted";
const e = (type: Type, path: string) => ({ type, path });

describe("coalesceEvents", () => {
  it("drops a file that was added and then deleted", () => {
    expect(coalesceEvents([e("added", "/a"), e("deleted", "/a")])).toEqual([]);
  });

  it("turns delete then add into a change", () => {
    expect(coalesceEvents([e("deleted", "/a"), e("added", "/a")])).toEqual([e("changed", "/a")]);
  });

  it("keeps added when it was added then changed", () => {
    expect(coalesceEvents([e("added", "/a"), e("changed", "/a")])).toEqual([e("added", "/a")]);
  });

  it("merges repeated changes", () => {
    expect(coalesceEvents([e("changed", "/a"), e("changed", "/a")])).toEqual([e("changed", "/a")]);
  });

  it("keeps different files apart, in order", () => {
    expect(coalesceEvents([e("changed", "/b"), e("added", "/a")])).toEqual([
      e("changed", "/b"),
      e("added", "/a"),
    ]);
  });

  it("a deleted folder swallows the events inside it", () => {
    expect(
      coalesceEvents([e("deleted", "/dir/a"), e("deleted", "/dir/b"), e("deleted", "/dir")]),
    ).toEqual([e("deleted", "/dir")]);
  });
});

describe("filterEvents", () => {
  it("drops excluded paths", () => {
    expect(
      filterEvents(
        [e("changed", "/p/node_modules/x/index.js"), e("changed", "/p/src/a.ts")],
        ["**/node_modules/**"],
      ),
    ).toEqual([e("changed", "/p/src/a.ts")]);
  });
});

describe("editors reacting to file events", () => {
  function opened(content = "old") {
    const root = workspace({ "a.txt": content });
    const path = join(root, "a.txt");
    const vs = code("|");
    vs.ide.openFile(path);
    return { vs, path };
  }

  it("reloads an unmodified editor whose file changed", () => {
    const { vs, path } = opened();
    writeFileSync(path, "new");

    vs.ctx.handleFileEvents([e("changed", path)]);

    expect(vs.lines()).toEqual(["new"]);
  });

  it("leaves a modified editor alone", () => {
    const { vs, path } = opened();
    vs.type("mine ");
    writeFileSync(path, "new");

    vs.ctx.handleFileEvents([e("changed", path)]);

    expect(vs.lines()).toEqual(["mine old"]);
  });

  it("marks an editor whose file was deleted", () => {
    const { vs, path } = opened();
    rmSync(path);

    vs.ctx.handleFileEvents([e("deleted", path)]);

    expect(vs.window().document.deleted).eq(true);
  });
});
