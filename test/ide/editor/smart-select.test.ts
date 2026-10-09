import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Expand / shrink selection (Shift+Alt+Right / Left).
//   editor.action.smartSelect.expand / editor.action.smartSelect.shrink
// Without a language server VS Code grows through: the word part
// (editor.smartSelect.selectSubwords, on by default), the word, the
// contents of the enclosing brackets or quotes, the brackets themselves,
// and outward. These specs check the order of the steps rather than every
// step, because other steps (like the whole line) may come in between.

const expand = "textEditor.expandSelection";
const shrink = "textEditor.shrinkSelection";

function steps(text: string, count: number) {
  const ide = code(text);
  const states: string[] = [];
  for (let i = 0; i < count; i++) {
    states.push(ide.executeCommand(expand).state());
  }
  return states;
}

const comesBefore = (states: string[], a: string, b: string) => {
  const first = states.indexOf(a);
  const second = states.indexOf(b);
  return first !== -1 && second !== -1 && first < second;
};

describe("expand selection", () => {
  it("first selects the word under the cursor", () => {
    expect(steps("foo(b|ar, baz)", 1)[0]).eq("foo(«bar», baz)");
  });

  it("selects a camelCase part before the whole word", () => {
    const states = steps("fooB|arBaz", 2);

    expect(states[0]).eq("foo«Bar»Baz");
    expect(states[1]).eq("«fooBarBaz»");
  });

  it("then the bracket contents, then the brackets too", () => {
    const states = steps("foo(b|ar, baz)", 6);

    expect(comesBefore(states, "foo(«bar», baz)", "foo(«bar, baz»)")).eq(true);
    expect(comesBefore(states, "foo(«bar, baz»)", "foo«(bar, baz)»")).eq(true);
  });

  it("goes through the contents of a string", () => {
    const states = steps('x = "a b|c"', 6);

    expect(states).toContain('x = "«a bc»"');
  });

  it("goes outward through nested brackets", () => {
    const states = steps("[(a|)]", 8);

    expect(comesBefore(states, "[«(a)»]", "«[(a)]»")).eq(true);
  });

  it("expands every cursor", () => {
    expect(code("a|a b|b").executeCommand(expand).state()).eq("«aa» «bb»");
  });
});

describe("shrink selection", () => {
  it("goes back one step", () => {
    const ide = code("foo(b|ar, baz)").executeCommand(expand).executeCommand(expand);
    const second = ide.state();
    ide.executeCommand(expand);

    expect(ide.executeCommand(shrink).state()).eq(second);
  });

  it("goes all the way back to the cursor", () => {
    const ide = code("foo(b|ar, baz)").executeCommand(expand).executeCommand(expand);

    expect(ide.executeCommand(shrink).executeCommand(shrink).state()).eq("foo(b|ar, baz)");
  });
});
