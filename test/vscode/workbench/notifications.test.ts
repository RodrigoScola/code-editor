import { describe, expect, it } from "vitest";
import { NotificationCenter } from "../../../src/Workbench/notifications.js";

// Proposed module src/Workbench/notifications.ts (the bell in the status
// bar, toasts in the corner).
//   center.notify({ severity: "info" | "warning" | "error", message,
//     source?, actions?: string[] }) -> handle
//     handle.result: Promise of the chosen action (undefined if closed)
//     handle.close()
//   center.progress({ message, total? }) -> { report(increment, message?), done() }
//   center.toasts() -> what is showing now
//   center.all() -> everything not yet cleared (the notification center)
//   center.setDoNotDisturb(on): nothing pops up as a toast, but everything
//     still goes to the center
//   center.clearAll()
// The same message from the same source with the same severity is not
// shown twice while the first is still there.

const messages = (list: { message: string }[]) => list.map((n) => n.message);

describe("notifications", () => {
  it("shows a toast and keeps it in the center", () => {
    const center = new NotificationCenter();
    center.notify({ severity: "info", message: "Saved" });

    expect(messages(center.toasts())).toEqual(["Saved"]);
    expect(messages(center.all())).toEqual(["Saved"]);
  });

  it("closing removes it", () => {
    const center = new NotificationCenter();
    center.notify({ severity: "info", message: "Saved" }).close();

    expect(center.all()).toEqual([]);
  });

  it("resolves with the action that was chosen", async () => {
    const center = new NotificationCenter();
    const handle = center.notify({ severity: "warning", message: "Reload?", actions: ["Reload", "Later"] });

    center.all()[0].choose("Reload");

    await expect(handle.result).resolves.eq("Reload");
  });

  it("resolves undefined when closed without a choice", async () => {
    const center = new NotificationCenter();
    const handle = center.notify({ severity: "info", message: "x", actions: ["Ok"] });

    handle.close();

    await expect(handle.result).resolves.toBeUndefined();
  });

  it("does not repeat an identical notification", () => {
    const center = new NotificationCenter();
    center.notify({ severity: "error", message: "Boom", source: "git" });
    center.notify({ severity: "error", message: "Boom", source: "git" });

    expect(center.all()).toHaveLength(1);
  });

  it("does repeat it for a different severity", () => {
    const center = new NotificationCenter();
    center.notify({ severity: "error", message: "Boom" });
    center.notify({ severity: "warning", message: "Boom" });

    expect(center.all()).toHaveLength(2);
  });
});

describe("do not disturb", () => {
  it("shows no toasts, even errors, but keeps them in the center", () => {
    const center = new NotificationCenter();
    center.setDoNotDisturb(true);

    center.notify({ severity: "error", message: "Boom" });

    expect(center.toasts()).toEqual([]);
    expect(messages(center.all())).toEqual(["Boom"]);
  });

  it("clearAll empties the center", () => {
    const center = new NotificationCenter();
    center.notify({ severity: "info", message: "a" });
    center.notify({ severity: "info", message: "b" });

    center.clearAll();

    expect(center.all()).toEqual([]);
  });
});

describe("progress", () => {
  it("adds up reported increments", () => {
    const center = new NotificationCenter();
    const progress = center.progress({ message: "Indexing", total: 100 });

    progress.report(30);
    progress.report(20, "halfway");

    expect(center.all()[0]).toMatchObject({ message: "halfway", worked: 50, total: 100 });
  });

  it("done removes it", () => {
    const center = new NotificationCenter();
    const progress = center.progress({ message: "Indexing" });

    progress.done();

    expect(center.all()).toEqual([]);
  });
});
