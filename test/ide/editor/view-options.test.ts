import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// View toggles, which are settings flipped by commands.
//   editor.action.toggleWordWrap          Alt+Z      editor.wordWrap off <-> on
//   editor.action.toggleMinimap                      editor.minimap.enabled
//   editor.action.toggleStickyScroll                 editor.stickyScroll.enabled
//   breadcrumbs.toggle                               breadcrumbs.enabled
//   editor.action.fontZoomIn / fontZoomOut / fontZoomReset   editor zoom level
// editor.rulers draws vertical lines at the given columns.

const get = (vs: ReturnType<typeof code>, key: string) => vs.ctx.configuration.get(key);

describe("toggles", () => {
  it("toggleWordWrap switches word wrap on and off", () => {
    const vs = code("|a").setting("editor.wordWrap", "off");

    expect(get(vs.run("editor.action.toggleWordWrap"), "editor.wordWrap")).eq("on");
    expect(get(vs.run("editor.action.toggleWordWrap"), "editor.wordWrap")).eq("off");
  });

  it("toggleMinimap switches the minimap", () => {
    const vs = code("|a").setting("editor.minimap.enabled", true);

    expect(get(vs.run("editor.action.toggleMinimap"), "editor.minimap.enabled")).eq(false);
  });

  it("toggleStickyScroll switches sticky scroll", () => {
    const vs = code("|a").setting("editor.stickyScroll.enabled", true);

    expect(get(vs.run("editor.action.toggleStickyScroll"), "editor.stickyScroll.enabled")).eq(
      false,
    );
  });

  it("breadcrumbs.toggle switches breadcrumbs", () => {
    const vs = code("|a").setting("breadcrumbs.enabled", true);

    expect(get(vs.run("breadcrumbs.toggle"), "breadcrumbs.enabled")).eq(false);
  });
});

describe("font zoom", () => {
  it("zoom in and out change the editor zoom level by one", () => {
    const vs = code("|a");

    vs.run("editor.action.fontZoomIn").run("editor.action.fontZoomIn");
    expect(vs.ctx.configuration.get("editor.zoomLevel")).eq(2);

    vs.run("editor.action.fontZoomOut");
    expect(vs.ctx.configuration.get("editor.zoomLevel")).eq(1);
  });

  it("reset goes back to 0", () => {
    const vs = code("|a").run("editor.action.fontZoomIn").run("editor.action.fontZoomReset");

    expect(vs.ctx.configuration.get("editor.zoomLevel")).eq(0);
  });
});

describe("rulers", () => {
  it("draws a ruler at each configured column", () => {
    const vs = code("|short line", { width: 60, height: 8 }).setting("editor.rulers", [20]);
    const area = vs.ide.textArea();
    const rows = vs.ide.textRows();

    // the empty rows below the text show the ruler in column 20
    expect(rows.at(-1)?.[area.x + 20]).not.eq(" ");
  });
});
