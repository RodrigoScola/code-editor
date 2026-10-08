import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// The gutter left of the text shows line numbers, counting from 1, on the
// same row as their line. Rows past the end of the file have no number.
//   :set nonumber            hides them
//   :set number relativenumber   current line absolute, others the distance

const tall = (count: number) =>
  Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");

// what is drawn left of the text on each text row
function gutter(ide: ReturnType<typeof vim>) {
  const rows = ide.textRows();
  const x = ide.textArea().x;
  return rows.map((row) => row.slice(0, x).trim());
}

const size = { width: 40, height: 16 };

describe("line numbers", () => {
  it("start at 1", () => {
    const ide = vim(tall(20), size);

    expect(gutter(ide).slice(0, 3)).toEqual(["1", "2", "3"]);
  });

  it("are on the same row as their line", () => {
    const ide = vim(tall(20), size);
    const rows = ide.textRows();
    const numbers = gutter(ide);

    rows.forEach((row, i) => {
      expect(numbers[i]).eq(String(i + 1));
      expect(row).toContain(`line ${i}`);
    });
  });

  it("are not drawn past the end of the file", () => {
    const ide = vim("a\nb\nc", size);

    expect(gutter(ide).slice(3).join("")).not.toMatch(/\d/);
  });

  it("follow the view when it scrolls", () => {
    const ide = vim(tall(200), size);
    ide.screen();
    ide.window().cursor().line = 150;

    const numbers = gutter(ide);
    const first = ide.viewport().firstLine;

    expect(first).greaterThan(0);
    expect(numbers[0]).eq(String(first + 1));
  });

  it("fit when they get long", () => {
    const ide = vim(tall(12000), size);
    ide.screen();
    ide.window().cursor().line = 11000;

    expect(gutter(ide).join(" ")).toContain("11001");
  });

  it(":set nonumber hides them", () => {
    const ide = vim(tall(20), size).keys(":set nonumber<CR>");

    expect(gutter(ide).join("")).not.toMatch(/\d/);
  });

  it(":set number relativenumber shows distances from the cursor line", () => {
    const ide = vim(tall(20), size);
    ide.window().cursor().line = 2;

    ide.keys(":set number relativenumber<CR>");

    expect(gutter(ide).slice(0, 5)).toEqual(["2", "1", "3", "1", "2"]);
  });
});
