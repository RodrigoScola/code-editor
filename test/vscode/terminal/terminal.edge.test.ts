import { describe, expect, it } from "vitest";
import { VirtualTerminal } from "../../../src/Terminal/VirtualTerminal.js";
import { ShellIntegration } from "../../../src/Terminal/shellIntegration.js";
import { detectLinks } from "../../../src/Terminal/links.js";
import { encodeKey, encodePaste } from "../../../src/Terminal/input.js";
import { formatTitle } from "../../../src/Terminal/terminalManager.js";
import { escapePathForShell } from "../../../src/Terminal/profiles.js";

// Edge cases for the terminal (base specs: emulator, shell-integration,
// links, input, terminal-manager, profiles).

describe("emulator", () => {
  it("a wide character that doesn't fit at the end of a row wraps whole", () => {
    const t = new VirtualTerminal(3, 2);
    t.write("ab你");

    expect([t.lineText(0), t.lineText(1)]).toEqual(["ab", "你"]);
  });

  it("writing in the last column waits to wrap until the next character", () => {
    const t = new VirtualTerminal(3, 2);
    t.write("abc");

    expect(t.cursor()).toEqual({ x: 2, y: 0 });

    t.write("\r");
    expect(t.cursor()).toEqual({ x: 0, y: 0 });
  });

  it("an unknown OSC is swallowed", () => {
    const t = new VirtualTerminal(10, 2);
    t.write("\x1b]9999;whatever\x07ok");

    expect(t.lineText(0)).eq("ok");
  });

  it("an OSC split across writes", () => {
    const t = new VirtualTerminal(10, 2);
    t.write("\x1b]0;ti");
    t.write("tle\x07x");

    expect(t.title()).eq("title");
    expect(t.lineText(0)).eq("x");
  });

  it("CUP past the edge is clamped", () => {
    const t = new VirtualTerminal(5, 3);
    t.write("\x1b[99;99HX");

    expect(t.cell(4, 2).char).eq("X");
  });

  it("cursor up at the top stays at the top", () => {
    const t = new VirtualTerminal(5, 3);
    t.write("\x1b[5AX");

    expect(t.cell(0, 0).char).eq("X");
  });

  it("SGR with no parameters resets", () => {
    const t = new VirtualTerminal(5, 1);
    t.write("\x1b[1;31mA\x1b[mB");

    expect(t.cell(1, 0)).toMatchObject({ bold: false, fg: null });
  });

  it("a carriage return goes back to column 0 and overwrites", () => {
    const t = new VirtualTerminal(10, 1);
    t.write("hello\rJ");

    expect(t.lineText(0)).eq("Jello");
  });
});

describe("shell integration", () => {
  const seq = (body: string) => `\x1b]${body}\x07`;

  it("a command with no output has no output lines", () => {
    const term = new VirtualTerminal(40, 10);
    const si = new ShellIntegration(term);
    term.write(seq("633;A") + "$ " + seq("633;B") + "true\r\n" + seq("633;E;true") + seq("633;C") + seq("633;D;0"));

    expect(si.output(si.commands()[0])).toEqual([]);
  });

  it("a prompt without a finished command records nothing yet", () => {
    const term = new VirtualTerminal(40, 10);
    const si = new ShellIntegration(term);
    term.write(seq("633;A") + "$ " + seq("633;B") + "sleep 10\r\n" + seq("633;C"));

    expect(si.commands()).toEqual([]);
  });

  it("the ST terminator works as well as BEL", () => {
    const term = new VirtualTerminal(40, 10);
    const si = new ShellIntegration(term);
    term.write("\x1b]633;P;Cwd=/st\x1b\\");

    expect(si.cwd()).eq("/st");
  });

  it("an OSC 7 path on Windows", () => {
    const term = new VirtualTerminal(40, 10);
    const si = new ShellIntegration(term);
    term.write(seq("7;file://host/C:/Users/me"));

    expect(si.cwd()).eq("C:/Users/me");
  });
});

describe("links", () => {
  const options = {
    cwd: "/p",
    exists: (path: string) => (path === "/p/a.ts" ? "file" : undefined),
  };

  it("a path inside quotes", () => {
    expect(detectLinks('see "a.ts:3"', options).find((l: { type: string }) => l.type === "file")).toMatchObject({
      text: "a.ts:3",
      line: 3,
    });
  });

  it("a URL with a port and a fragment", () => {
    expect(detectLinks("http://localhost:3000/x#y", options)[0]).toMatchObject({
      type: "url",
      text: "http://localhost:3000/x#y",
    });
  });

  it("a URL's balanced parentheses are kept", () => {
    expect(detectLinks("https://en.wikipedia.org/wiki/Foo_(bar)", options)[0].text).eq(
      "https://en.wikipedia.org/wiki/Foo_(bar)",
    );
  });

  it("an empty line has no links", () => {
    expect(detectLinks("", options)).toEqual([]);
  });
});

describe("input", () => {
  it("Ctrl+Alt+letter sends ESC and the control character", () => {
    expect(encodeKey({ key: "a", ctrl: true, alt: true }, {})).eq("\x1b\x01");
  });

  it("Alt+Backspace deletes a word in most shells", () => {
    expect(encodeKey({ key: "Backspace", alt: true }, {})).eq("\x1b\x7f");
  });

  it("an empty paste sends nothing", () => {
    expect(encodePaste("", { bracketedPaste: true })).eq("");
  });

  it("pasted text containing the end-of-paste sequence has it removed", () => {
    expect(encodePaste("a\x1b[201~b", { bracketedPaste: true })).eq("\x1b[200~ab\x1b[201~");
  });
});

describe("titles and paths", () => {
  it("unknown title variables become empty", () => {
    expect(formatTitle("${process}${nope}", { process: "bash" }, " - ")).eq("bash");
  });

  it("separators don't stack when several parts are empty", () => {
    expect(
      formatTitle("${process}${separator}${task}${separator}${cwdFolder}", { process: "bash", task: "", cwdFolder: "src" }, " - "),
    ).eq("bash - src");
  });

  it("bash escapes a path with other special characters", () => {
    expect(escapePathForShell("/p/a$b.txt", "bash")).eq("'/p/a$b.txt'");
  });
});
