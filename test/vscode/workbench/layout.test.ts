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

const layout = (vs: ReturnType<typeof code>) => vs.ctx.layout.state();

describe("toggles", () => {
  it("toggleSidebarVisibility", () => {
    const vs = code("|");
    const before = layout(vs).sidebarVisible;

    expect(layout(vs.run("workbench.action.toggleSidebarVisibility")).sidebarVisible).eq(!before);
  });

  it("togglePanel", () => {
    const vs = code("|");
    const before = layout(vs).panelVisible;

    expect(layout(vs.run("workbench.action.togglePanel")).panelVisible).eq(!before);
  });

  it("toggleStatusbarVisibility", () => {
    const vs = code("|").run("workbench.action.toggleStatusbarVisibility");

    expect(layout(vs).statusBarVisible).eq(false);
  });

  it("positionPanelRight moves the panel", () => {
    expect(layout(code("|").run("workbench.action.positionPanelRight")).panelPosition).eq("right");
  });

  it("toggleMaximizedPanel opens and maximizes the panel", () => {
    const state = layout(code("|").run("workbench.action.toggleMaximizedPanel"));

    expect(state.panelVisible).eq(true);
    expect(state.panelMaximized).eq(true);
  });
});

describe("zen mode", () => {
  it("hides everything but the editor", () => {
    const state = layout(code("|").run("workbench.action.toggleZenMode"));

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
    const vs = code("|").setting("zenMode.hideStatusBar", false).run("workbench.action.toggleZenMode");

    expect(layout(vs).statusBarVisible).eq(true);
  });

  it("leaving restores what was there before", () => {
    const vs = code("|").run("workbench.action.togglePanel");
    const before = layout(vs);

    vs.run("workbench.action.toggleZenMode").run("workbench.action.toggleZenMode");

    expect(layout(vs)).toEqual(before);
  });

  it("exitZenMode leaves it", () => {
    const vs = code("|").run("workbench.action.toggleZenMode").run("workbench.action.exitZenMode");

    expect(layout(vs).zenMode).eq(false);
  });
});

describe("centered layout", () => {
  it("toggles", () => {
    expect(layout(code("|").run("workbench.action.toggleCenteredLayout")).centered).eq(true);
  });
});

describe("persistence", () => {
  it("restores a saved layout", () => {
    const vs = code("|").run("workbench.action.toggleSidebarVisibility").run("workbench.action.positionPanelLeft");
    const saved = JSON.parse(JSON.stringify(vs.ctx.layout.serialize()));

    const fresh = code("|");
    fresh.ctx.layout.restore(saved);

    expect(layout(fresh)).toEqual(layout(vs));
  });
});
