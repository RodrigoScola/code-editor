import { describe, expect, it } from "vitest";
import { InputParser } from "./inputParser.js";

describe("InputParser.ParseKey", () => {
  it("normalizes ctrl+h to h instead of backspace", () => {
    const parsed = InputParser.ParseKey("\b", {
      name: "backspace",
      ctrl: true,
      meta: false,
      shift: false,
    } as any);

    expect(parsed.token).toBe("h");
    expect(parsed.ctrl).toBe(true);
  });

  it("keeps plain backspace as backspace", () => {
    const parsed = InputParser.ParseKey("\b", {
      name: "backspace",
      ctrl: false,
      meta: false,
      shift: false,
    } as any);

    expect(parsed.token).toBe("<BS>");
    expect(parsed.ctrl).toBe(false);
  });
});
