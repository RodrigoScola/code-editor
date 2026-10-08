import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// Messages to the user ("written", "pattern not found", errors from tools):
//   ctx.notify(text, level)   level: "info" | "warning" | "error"
//   shown in the status line until the next key press
//   ctx.messages() -> every message so far, oldest first ({ text, level })
//   errors from commands go through the same place

const wide = { width: 100 };

describe("notifications", () => {
  it("shows a message in the status line", () => {
    const ide = vim("|abc", wide);

    ide.ctx.notify("Saved a.txt", "info");

    expect(ide.statusLine()).toContain("Saved a.txt");
  });

  it("clears it on the next key", () => {
    const ide = vim("|abc\ndef", wide);
    ide.ctx.notify("Saved a.txt", "info");

    ide.keys("j");

    expect(ide.statusLine()).not.toContain("Saved a.txt");
  });

  it("keeps a history of messages", () => {
    const ide = vim("|abc", wide);

    ide.ctx.notify("one", "info");
    ide.ctx.notify("two", "error");

    expect(ide.ctx.messages().slice(-2)).toEqual([
      { text: "one", level: "info" },
      { text: "two", level: "error" },
    ]);
  });

  it("errors from commands end up in the history", () => {
    const ide = vim("|abc", wide).keys(":foo<CR>");

    const last = ide.ctx.messages().at(-1);

    expect(last?.level).eq("error");
    expect(last?.text).toContain("Not an editor command");
  });
});
