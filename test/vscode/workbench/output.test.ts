import { describe, expect, it } from "vitest";
import { OutputService } from "../../../src/Workbench/output.js";

// Proposed module src/Workbench/output.ts (the Output panel, Ctrl+Shift+U).
//   service.channel(name) -> channel (the same one each time for a name)
//     channel.append(text) / appendLine(text) / replace(text) / clear()
//     channel.content()
//   service.logChannel(name, { clock? }) -> log channel
//     log.trace / debug / info / warn / error(message)
//     log.setLevel("trace" | "debug" | "info" | "warning" | "error" | "off")
//     lines look like "2024-03-05 07:08:09.010 [info] message"
//   service.names() -> channel names, sorted
//   service.show(name) / service.active()

describe("output channels", () => {
  it("collects appended text", () => {
    const channel = new OutputService().channel("Git");

    channel.append("a");
    channel.appendLine("b");
    channel.append("c");

    expect(channel.content()).eq("ab\nc");
  });

  it("returns the same channel for the same name", () => {
    const service = new OutputService();
    service.channel("Git").append("x");

    expect(service.channel("Git").content()).eq("x");
  });

  it("replace and clear", () => {
    const channel = new OutputService().channel("Tasks");
    channel.append("old");

    channel.replace("new");
    expect(channel.content()).eq("new");

    channel.clear();
    expect(channel.content()).eq("");
  });

  it("lists channels by name and remembers the shown one", () => {
    const service = new OutputService();
    service.channel("Tasks");
    service.channel("Git");

    service.show("Tasks");

    expect(service.names()).toEqual(["Git", "Tasks"]);
    expect(service.active()).eq("Tasks");
  });
});

describe("log channels", () => {
  const clock = () => new Date(2024, 2, 5, 7, 8, 9, 10);

  it("writes a timestamp and the level", () => {
    const log = new OutputService().logChannel("Git", { clock });

    log.info("fetching");

    expect(log.content()).eq("2024-03-05 07:08:09.010 [info] fetching");
  });

  it("drops messages below the level", () => {
    const log = new OutputService().logChannel("Git", { clock });
    log.setLevel("warning");

    log.info("hidden");
    log.warn("shown");
    log.error("also shown");

    expect(log.content().split("\n").map((line: string) => line.slice(24))).toEqual([
      "[warning] shown",
      "[error] also shown",
    ]);
  });

  it("off drops everything", () => {
    const log = new OutputService().logChannel("Git", { clock });
    log.setLevel("off");

    log.error("nothing");

    expect(log.content()).eq("");
  });

  it("info is the default level", () => {
    const log = new OutputService().logChannel("Git", { clock });

    log.debug("hidden");
    log.trace("hidden");

    expect(log.content()).eq("");
  });
});
