import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// User key mappings, Vim style (:help key-mapping):
//   :nnoremap {lhs} {rhs}   normal mode, rhs keys are not remapped again
//   :nmap {lhs} {rhs}       normal mode, rhs keys can use other mappings
//   :inoremap {lhs} {rhs}   insert mode
//   :nunmap {lhs}           remove a mapping
// Special keys inside the mapping text use Vim notation (<Esc>, <Space>);
// these tests type "<lt>" to get a literal "<" into the command line.
// A count typed before a mapping applies to what it maps to.

describe("mappings", () => {
  it(":nnoremap adds a normal mode mapping", () => {
    expect(after("|a\nb", ":nnoremap Q dd<CR>Q")).eq("|b");
  });

  it("mappings can start with <Space> (a leader key)", () => {
    expect(after("|a\nb", ":nnoremap <lt>Space>d dd<CR> d")).eq("|b");
  });

  it("noremap does not apply other mappings to its keys", () => {
    const ide = vim("a\n|b").keys(":nnoremap j k<CR>:nnoremap k j<CR>");

    expect(ide.keys("j").cursor().line).eq(0);
  });

  it("nmap does apply other mappings to its keys", () => {
    expect(after("|a\nb", ":nnoremap X dd<CR>:nmap Y X<CR>Y")).eq("|b");
  });

  it(":inoremap jk <Esc> leaves insert mode by typing jk", () => {
    const ide = vim("|").keys(":inoremap jk <lt>Esc><CR>ihijk");

    expect(ide.mode()).eq("normal");
    expect(ide.text()).eq("h|i");
  });

  it("a count before a mapping applies to what it maps to", () => {
    const ide = vim("|a\nb\nc\nd").keys(":nnoremap Q j<CR>3Q");

    expect(ide.cursor().line).eq(3);
  });

  it(":nunmap removes a mapping", () => {
    const ide = vim("|a\nb\nc").keys(":nnoremap Q dd<CR>Q");
    expect(ide.lines()).toEqual(["b", "c"]);

    ide.keys(":nunmap Q<CR>Q");

    expect(ide.lines()).toEqual(["b", "c"]);
  });
});

describe("pending keys", () => {
  it("a key that continues nothing does not swallow the next one", () => {
    expect(vim("|a\nb").keys("dzj").cursor().line).eq(1);
  });

  it("<Esc> cancels a half-typed command", () => {
    const ide = vim("|a\nb").keys("d<Esc>j");

    expect(ide.lines()).toEqual(["a", "b"]);
    expect(ide.cursor().line).eq(1);
  });
});
