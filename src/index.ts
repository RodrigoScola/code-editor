import process from "process";
import readline from "node:readline";
import fs from "fs";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent, TextDisplay } from "./ui/components.js";
import colors from "./ui/colors.js";
import { Renderer } from "./ui/renderer.js";
import { LayoutEngine } from "./ui/layout.js";

// reset any mouse-tracking mode left on by a previous run that didn't exit
// cleanly (the terminal keeps this state, it isn't tied to our process)
disableMouseEvents();

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

let layout = LayoutEngine.CreateBounds();
layout.height = process.stdout.rows;
layout.width = process.stdout.columns;

const cnv = new Canvas().setLayout(layout);
const root = new DisplayComponent().setLayout(layout);

root.setDirection("horizontal");

const treeView = new DisplayComponent();

treeView.setMaxW(30).setStyles({
  backgroundColor: colors.MAGENTA_BACKGROUND,
});

const divisor = new DisplayComponent();
divisor.setStyles({ backgroundColor: colors.YELLOW_BACKGROUND });
divisor.setMaxW(1);

const editorWindow = new DisplayComponent();
editorWindow.setStyles({ backgroundColor: colors.MAGENTA_BACKGROUND });

const gitignore = fs.readFileSync(".gitignore", { encoding: "utf-8" });
const lines = gitignore.split("\n");
lines.pop();

for (const line of lines) {
  const txt = new TextDisplay().setContent(line);

  editorWindow.addChildren(txt.setMaxH(1));
}

root.addChildren(treeView).addChildren(divisor).addChildren(editorWindow);

const initialLayout = LayoutEngine.CreateBounds();

initialLayout.height = process.stdout.rows;
initialLayout.width = process.stdout.columns;

cnv.setLayout(initialLayout);
root.setLayout(initialLayout);

LayoutEngine.Measure(root, root.layout());

Renderer.build(root, cnv);

process.stdout.write("\x1b[H" + Renderer.render(cnv));

process.stdout.on("resize", () => handleResize());

// process.stdout.columns/rows is a cached value that some terminals never
// update (e.g. moving the window to a monitor with different DPI scaling
// often doesn't fire a real console resize event on Windows), so instead of
// trusting it we actively ask the terminal for its real size via a cursor
// position report, and poll that.
let lastCols = process.stdout.columns;
let lastRows = process.stdout.rows;
// while true, a cursor-position-report request is in flight: the terminal's
// raw reply lands on stdin and readline's keypress parser (which can't
// recognize it) breaks it into spurious per-character keypress events, so
// real input handling is paused until the reply is consumed
let awaitingCPR = false;
setInterval(async () => {
  const size = (await queryTerminalSize()) ?? {
    columns: process.stdout.columns,
    rows: process.stdout.rows,
  };
  if (size.columns !== lastCols || size.rows !== lastRows) {
    lastCols = size.columns;
    lastRows = size.rows;
    handleResize(size);
  }
}, 250);

function queryTerminalSize(
  timeoutMs = 150,
): Promise<{ columns: number; rows: number } | null> {
  return new Promise((resolve) => {
    let settled = false;
    awaitingCPR = true;
    const onData = (chunk: Buffer) => {
      const match = chunk.toString("utf8").match(/\x1b\[(\d+);(\d+)R/);
      if (match) {
        settle({ rows: Number(match[1]), columns: Number(match[2]) });
      }
    };
    const timer = setTimeout(() => settle(null), timeoutMs);
    function settle(result: { columns: number; rows: number } | null) {
      if (settled) return;
      settled = true;
      awaitingCPR = false;
      clearTimeout(timer);
      process.stdin.off("data", onData);
      resolve(result);
    }
    process.stdin.on("data", onData);
    // save cursor, jump to a coordinate past any real terminal size (it
    // clamps to the actual last row/col), ask for the cursor position, then
    // restore the cursor to where it was
    process.stdout.write("\x1b[s\x1b[999;999H\x1b[6n\x1b[u");
  });
}

async function handleResize(size?: { columns: number; rows: number }) {
  const resolved = size ??
    (await queryTerminalSize()) ?? {
      columns: process.stdout.columns,
      rows: process.stdout.rows,
    };

  clearOutput();

  const resizedLayout = LayoutEngine.CreateBounds();
  resizedLayout.height = resolved.rows;
  resizedLayout.width = resolved.columns;
  cnv.setLayout(resizedLayout);
  root.setLayout(resizedLayout);
  LayoutEngine.Measure(root, root.layout());

  Renderer.build(root, cnv);
  const out = Renderer.render(cnv);

  process.stdout.write("\x1b[H" + out);
}

process.stdout.on("finish", () => {
  clearOutput();
  disableMouseEvents();
});
process.stdin.on("keypress", (str, key) => {
  if (awaitingCPR) {
    return;
  }

  // if (document.mode === "visual") {
  //   if (key.sequence === "j") {
  //     document.cursor.down();
  //   } else if (key.sequence === "k") {
  //     document.cursor.up();
  //   } else if (key.sequence === "h") {
  //     document.cursor.left();
  //   } else if (key.sequence === "l") {
  //     document.cursor.right();
  //   } else if (key.sequence === "o") {
  //     editorWindow.addChildren(new TextDisplay());
  //     document.cursor.down();
  //     document.mode = "insert";
  //   }
  // } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
  //   const text = editorWindow.children().at(document.cursor.y) as
  //     | TextDisplay
  //     | undefined;
  //   if (!text) {
  //     return;
  //   }
  //   text.setContent(text.content() + str);
  // }

  process.stdout.write("\x1b[H" + Renderer.render(cnv));
});

function disableMouseEvents() {
  process.stdout.write("\x1b[?1000l");
  process.stdout.write("\x1b[?1006l");
}

function clearOutput() {
  process.stdout.write("\x1b[?1049l");
}

//add a test case that the text color should not be reset after the letter color

// handy color palette for future components
