import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// q{a-z} starts recording keys into a register, q stops, @{a-z} plays them
// back, @@ plays the last one again. :help recording

describe("macros", () => {
  it("records and replays", () => {
    const ide = vim("|a\nb\nc").keys("qaA;<Esc>jq@a");

    expect(ide.lines()).toEqual(["a;", "b;", "c"]);
  });

  it("@@ replays the last macro", () => {
    const ide = vim("|a\nb\nc").keys("qaA;<Esc>jq@a@@");

    expect(ide.lines()).toEqual(["a;", "b;", "c;"]);
  });

  it("takes a count", () => {
    const ide = vim("|1\n2\n3\n4").keys("qaA!<Esc>jq2@a");

    expect(ide.lines()).toEqual(["1!", "2!", "3!", "4"]);
  });

  it("recording does not change the text by itself", () => {
    expect(vim("|abc").keys("qaq").lines()).toEqual(["abc"]);
  });

  it("the status line shows that a macro is being recorded", () => {
    const ide = vim("|abc").keys("qa");

    expect(ide.statusLine()).toContain("recording @a");

    ide.keys("q");
    expect(ide.statusLine()).not.toContain("recording");
  });
});
