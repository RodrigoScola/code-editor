import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// The workbench layout, as state on ctx.layout (proposed):
//   { sidebarVisible, panelVisible, statusBarVisible, activityBarVisible,
//     lineNumbersVisible, zenMode, centered, panelMaximized, panelPosition }
// Commands:
//   workbench.action.toggleSidebarVisibility    Ctrl+B
//   workbench.action.togglePanel                Ctrl+J
//   workbench.action.toggleStatusbarVisibility
//   workbench.action.toggleZenMode              Ctrl+K Z
//   workbench.action.exitZenMode                Esc Esc
//   workbench.action.toggleCenteredLayout
//   workbench.action.toggleMaximizedPanel
//   workbench.action.positionPanelLeft / Right / Bottom
// Zen mode hides the side bar, panel, activity bar and (with
// zenMode.hideStatusBar, zenMode.hideLineNumbers, default true) the status
// bar and line numbers; leaving it restores what was there before.
// ctx.layout.serialize() / ctx.layout.restore(state) keep it across runs.

const layout = (ide: ReturnType<typeof code>) => ide.layout.state();

describe("toggles", () => {
  it("toggleSidebarVisibility", () => {
    const ide = code("|");
    const before = layout(ide).sidebarVisible;

    expect(layout(ide.executeCommand("layout.toggleSidebar")).sidebarVisible).eq(!before);
  });

  it("togglePanel", () => {
    const ide = code("|");
    const before = layout(ide).panelVisible;

    expect(layout(ide.executeCommand("layout.togglePanel")).panelVisible).eq(!before);
  });

  it("toggleStatusbarVisibility", () => {
    const ide = code("|").executeCommand("layout.toggleStatusBar");

    expect(layout(ide).statusBarVisible).eq(false);
  });

  it("positionPanelRight moves the panel", () => {
    expect(layout(code("|").executeCommand("layout.panelRight")).panelPosition).eq("right");
  });

  it("toggleMaximizedPanel opens and maximizes the panel", () => {
    const state = layout(code("|").executeCommand("layout.toggleMaximizedPanel"));

    expect(state.panelVisible).eq(true);
    expect(state.panelMaximized).eq(true);
  });
});

describe("zen mode", () => {
  it("hides everything but the editor", () => {
    const state = layout(code("|").executeCommand("layout.toggleZenMode"));

    expect(state).toMatchObject({
      zenMode: true,
      sidebarVisible: false,
      panelVisible: false,
      activityBarVisible: false,
      statusBarVisible: false,
      lineNumbersVisible: false,
    });
  });

  it("keeps the status bar with zenMode.hideStatusBar false", () => {
    const ide = code("|").setting("zen_hide_status_bar", false).executeCommand("layout.toggleZenMode");

    expect(layout(ide).statusBarVisible).eq(true);
  });

  it("leaving restores what was there before", () => {
    const ide = code("|").executeCommand("layout.togglePanel");
    const before = layout(ide);

    ide.executeCommand("layout.toggleZenMode").executeCommand("layout.toggleZenMode");

    expect(layout(ide)).toEqual(before);
  });

  it("exitZenMode leaves it", () => {
    const ide = code("|").executeCommand("layout.toggleZenMode").executeCommand("layout.exitZenMode");

    expect(layout(ide).zenMode).eq(false);
  });
});

describe("centered layout", () => {
  it("toggles", () => {
    expect(layout(code("|").executeCommand("layout.toggleCentered")).centered).eq(true);
  });
});

describe("persistence", () => {
  it("restores a saved layout", () => {
    const ide = code("|").executeCommand("layout.toggleSidebar").executeCommand("layout.panelLeft");
    const saved = JSON.parse(JSON.stringify(ide.layout.serialize()));

    const fresh = code("|");
    fresh.layout.restore(saved);

    expect(layout(fresh)).toEqual(layout(ide));
  });
});
