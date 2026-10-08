import { afterEach, describe, expect, it } from "vitest";
import {
  Configuration,
  loadSettings,
  setConfiguration,
} from "../../../src/config.js";
import { vim } from "../harness.js";

// Two ways to change settings:
//
// 1. :set, Vim style (:help options)
//      :set tabstop=2      (or ts=2)       tab_width
//      :set shiftwidth=2   (or sw=2)       shift_width: one indent level
//      :set expandtab / noexpandtab        expand_tab: indent with spaces
//      :set tabstop?                       show the value
//
// 2. Settings files, VS Code style. Proposed in src/config.ts:
//      loadSettings(layers: string[]) -> { settings, errors }
//    Each layer is the text of a JSON file (comments and trailing commas
//    allowed), later layers win: [user, workspace]. A broken layer is
//    reported in errors and skipped; the others still apply. Unknown keys
//    and values of the wrong type are reported and ignored.

const original = structuredClone(Configuration());
afterEach(() => setConfiguration(structuredClone(original)));

describe(":set", () => {
  it("tabstop changes the tab width", () => {
    vim("|a").keys(":set tabstop=2<CR>");

    expect(Configuration().tab_width).eq(2);
  });

  it("takes the short names", () => {
    vim("|a").keys(":set ts=8<CR>");

    expect(Configuration().tab_width).eq(8);
  });

  it("expandtab and shiftwidth make >> indent with spaces", () => {
    const ide = vim("|foo").keys(":set expandtab shiftwidth=2<CR>>>");

    expect(ide.lines()).toEqual(["  foo"]);
  });

  it("noexpandtab makes >> indent with a tab", () => {
    const ide = vim("|foo").keys(":set noexpandtab shiftwidth=4 tabstop=4<CR>>>");

    expect(ide.lines()).toEqual(["\tfoo"]);
  });

  it("option? shows the value", () => {
    // the default, so the typed command can't be mistaken for the answer
    const ide = vim("|a", { width: 60 }).keys(":set tabstop?<CR>");

    expect(ide.statusLine()).toContain("tabstop=4");
  });

  it("reports unknown options", () => {
    const ide = vim("|a", { width: 60 }).keys(":set nope=1<CR>");

    expect(ide.statusLine()).toContain("Unknown option: nope");
  });
});

describe("settings files", () => {
  it("uses the defaults with no files", () => {
    expect(loadSettings([]).settings.tab_width).eq(4);
  });

  it("a file overrides the defaults", () => {
    expect(loadSettings(['{ "tab_width": 2 }']).settings.tab_width).eq(2);
  });

  it("later files win (workspace over user)", () => {
    const { settings } = loadSettings(['{ "tab_width": 2 }', '{ "tab_width": 8 }']);

    expect(settings.tab_width).eq(8);
  });

  it("allows comments and trailing commas", () => {
    const { settings, errors } = loadSettings([
      '{\n  // two is plenty\n  "tab_width": 2,\n}',
    ]);

    expect(errors).toEqual([]);
    expect(settings.tab_width).eq(2);
  });

  it("reports a broken file and still applies the others", () => {
    const { settings, errors } = loadSettings(['{ "tab_width": 2 }', "{ oops"]);

    expect(settings.tab_width).eq(2);
    expect(errors).length(1);
  });

  it("reports unknown settings", () => {
    const { errors } = loadSettings(['{ "nope": 1 }']);

    expect(errors.join("\n")).toContain("nope");
  });

  it("reports values of the wrong type and keeps the default", () => {
    const { settings, errors } = loadSettings(['{ "tab_width": "big" }']);

    expect(settings.tab_width).eq(4);
    expect(errors.join("\n")).toContain("tab_width");
  });
});
