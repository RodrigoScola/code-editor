import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// View toggles, which are settings flipped by commands.
//   editor.action.toggleWordWrap          Alt+Z      editor.wordWrap off <-> on
//   editor.action.toggleMinimap                      editor.minimap.enabled
//   editor.action.toggleStickyScroll                 editor.stickyScroll.enabled
//   breadcrumbs.toggle                               breadcrumbs.enabled
//   editor.action.fontZoomIn / fontZoomOut / fontZoomReset   editor zoom level
// editor.rulers draws vertical lines at the given columns.

const get = (ide: ReturnType<typeof code>, key: string) => ide.setting(key);

describe("toggles", () => {
  it("toggleWordWrap switches word wrap on and off", () => {
    const ide = code("|a").setting("wrap", "off");

    expect(get(ide.executeCommand("view.toggleWordWrap"), "wrap")).eq("on");
    expect(get(ide.executeCommand("view.toggleWordWrap"), "wrap")).eq("off");
  });

  it("toggleMinimap switches the minimap", () => {
    const ide = code("|a").setting("minimap", true);

    expect(get(ide.executeCommand("view.toggleMinimap"), "minimap")).eq(false);
  });

  it("toggleStickyScroll switches sticky scroll", () => {
    const ide = code("|a").setting("sticky_scroll", true);

    expect(get(ide.executeCommand("view.toggleStickyScroll"), "sticky_scroll")).eq(
      false,
    );
  });

  it("breadcrumbs.toggle switches breadcrumbs", () => {
    const ide = code("|a").setting("breadcrumbs", true);

    expect(get(ide.executeCommand("view.toggleBreadcrumbs"), "breadcrumbs")).eq(false);
  });
});

describe("font zoom", () => {
  it("zoom in and out change the editor zoom level by one", () => {
    const ide = code("|a");

    ide.executeCommand("view.zoomIn").executeCommand("view.zoomIn");
    expect(ide.setting("zoom_level")).eq(2);

    ide.executeCommand("view.zoomOut");
    expect(ide.setting("zoom_level")).eq(1);
  });

  it("reset goes back to 0", () => {
    const ide = code("|a").executeCommand("view.zoomIn").executeCommand("view.zoomReset");

    expect(ide.setting("zoom_level")).eq(0);
  });
});

describe("rulers", () => {
  it("draws a ruler at each configured column", () => {
    const ide = code("|short line", { width: 60, height: 8 }).setting("rulers", [20]);
    const area = ide.textArea();
    const rows = ide.textRows();

    // the empty rows below the text show the ruler in column 20
    expect(rows.at(-1)?.[area.x + 20]).not.eq(" ");
  });
});
