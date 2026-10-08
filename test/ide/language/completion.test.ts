import { describe, expect, it } from "vitest";
import { CompletionSession } from "../../../src/Language/completion.js";
import { vim } from "../harness.js";

// Proposed module src/Language/completion.ts: the list behind the
// completion popup, whatever the items come from (words in the buffer, a
// language server, snippets).
//
//   new CompletionSession(items)   item: { label, insertText?, sortText?,
//                                          kind?, detail? }
//   session.filter(prefix) -> the items left, best first: prefix matches,
//                             then fuzzy matches; ties by sortText, then
//                             label. Resets the selection to the first.
//   session.selected() / session.next() / session.previous()  (wrap)
//
// In insert mode (Vim's keyword completion, :help i_CTRL-N):
//   <C-n> / <C-p> complete the word before the cursor from words in the
//   buffer, searching forward / backward; pressing again cycles. <C-e>
//   puts back what was typed. Typing anything else keeps the completion.

const items = [
  { label: "foobar" },
  { label: "foo" },
  { label: "bar" },
  { label: "xfoo" },
];

const labels = (list: { label: string }[]) => list.map((item) => item.label);

describe("CompletionSession", () => {
  it("keeps the items that match the typed prefix", () => {
    const session = new CompletionSession(items);

    expect(labels(session.filter("fo"))).toEqual(["foo", "foobar", "xfoo"]);
  });

  it("puts prefix matches before matches further in", () => {
    const session = new CompletionSession(items);

    expect(labels(session.filter("fo")).at(-1)).eq("xfoo");
  });

  it("matches fuzzily", () => {
    const session = new CompletionSession(items);

    expect(labels(session.filter("fbr"))).toEqual(["foobar"]);
  });

  it("orders by sortText, then label", () => {
    const session = new CompletionSession([
      { label: "b", sortText: "1" },
      { label: "a", sortText: "2" },
      { label: "c", sortText: "1" },
    ]);

    expect(labels(session.filter(""))).toEqual(["b", "c", "a"]);
  });

  it("selects the first item and cycles with next/previous", () => {
    const session = new CompletionSession(items);
    session.filter("fo");

    expect(session.selected()?.label).eq("foo");
    session.next();
    expect(session.selected()?.label).eq("foobar");
    session.previous();
    session.previous();
    expect(session.selected()?.label).eq("xfoo");
  });

  it("resets the selection when the prefix changes", () => {
    const session = new CompletionSession(items);
    session.filter("fo");
    session.next();

    session.filter("foob");

    expect(session.selected()?.label).eq("foobar");
  });

  it("keeps the text to insert when it differs from the label", () => {
    const session = new CompletionSession([{ label: "log()", insertText: "log($1)" }]);
    session.filter("lo");

    expect(session.selected()?.insertText).eq("log($1)");
  });
});

describe("<C-n> word completion", () => {
  it("completes from a word in the buffer", () => {
    expect(vim("foobar\n|").keys("ifo<C-n><Esc>").lines()[1]).eq("foobar");
  });

  it("pressing again goes to the next match", () => {
    expect(vim("foobar foobaz\n|").keys("ifo<C-n><C-n><Esc>").lines()[1]).eq("foobaz");
  });

  it("<C-p> searches backwards", () => {
    expect(vim("foobar foobaz\n|").keys("ifo<C-p><Esc>").lines()[1]).eq("foobaz");
  });

  it("<C-e> puts back what was typed", () => {
    expect(vim("foobar\n|").keys("ifo<C-n><C-e><Esc>").lines()[1]).eq("fo");
  });

  it("typing more keeps the completed word", () => {
    expect(vim("foobar\n|").keys("ifo<C-n>!<Esc>").lines()[1]).eq("foobar!");
  });

  it("leaves the text alone when nothing matches", () => {
    expect(vim("foobar\n|").keys("ixyz<C-n><Esc>").lines()[1]).eq("xyz");
  });
});
