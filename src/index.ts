import process from "process";
import fs from "fs";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent, TextDisplay } from "./ui/components.js";
import colors from "./ui/colors.js";

enableMouseEvents();

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

const cnv = new Canvas();

// const editorWindow = new DisplayComponent();
// const commandWindow = new DisplayComponent();
// editorWindow.styles.backgroundColor = colors.MAGENTA_BACKGROUND;
// commandWindow.styles.backgroundColor = colors.YELLOW_BACKGROUND;

// cnv.addChildren([editorWindow, commandWindow]);

// const textEditor = new TextDisplay();

// editorWindow.addChildren(textEditor);

// textEditor.setText("this is working?");

// commandWindow.setMaxH(1);

const out = new DisplayComponent();

const dirnames = fs.readdirSync(".");

for (const name of dirnames) {
  const txt = new TextDisplay()
    .setText(name)
    .setStyles({ color: colors.RED_FOREGROUND });

  out.addChildren(txt);
}

out.setMaxW(Math.max(...dirnames.map((name) => name.length)) + 20);

out.setStyles({
  backgroundColor: colors.MAGENTA_BACKGROUND,
});

out.setStyles({ backgroundColor: colors.MAGENTA_BACKGROUND });

cnv.setDirection("horizontal");

const oneLine = new DisplayComponent();
oneLine.setStyles({ backgroundColor: colors.YELLOW_BACKGROUND });
oneLine.setMaxW(1);

const out2 = new DisplayComponent();
out2.setStyles({ backgroundColor: colors.MAGENTA_BACKGROUND });

cnv.addChildren(out).addChildren(oneLine).addChildren(out2);

// setupActiveEditorFrame(state);
// setupCommandWindow(state);
// renderWindow(state);

cnv.setHeight(process.stdout.rows);
cnv.setWidth(process.stdout.columns);

cnv.build();

process.stdout.write(cnv.render());

process.stdin.on("data", (chunk: Buffer) => {
  // ignore the cursor-position-report replies used by queryTerminalSize()
  if (/\x1b\[\d+;\d+R/.test(chunk.toString("utf8"))) return;

  renderWindow();

  cnv.setHeight(process.stdout.rows);
  cnv.setWidth(process.stdout.columns);

  cnv.build();
  process.stdout.write(cnv.render());

  // renderWindow(state);
});

process.stdout.on("resize", () => handleResize());

// process.stdout.columns/rows is a cached value that some terminals never
// update (e.g. moving the window to a monitor with different DPI scaling
// often doesn't fire a real console resize event on Windows), so instead of
// trusting it we actively ask the terminal for its real size via a cursor
// position report, and poll that.
let lastCols = process.stdout.columns;
let lastRows = process.stdout.rows;
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

  cnv.setHeight(resolved.rows);
  cnv.setWidth(resolved.columns);

  cnv.build();
  process.stdout.write(cnv.render());
}

process.stdout.on("finish", () => {
  clearOutput();
  disableMouseEvents();
});

function enableMouseEvents() {
  process.stdout.write("\x1b[?1000h");
  process.stdout.write("\x1b[?1006h");
}

function disableMouseEvents() {
  process.stdout.write("\x1b[?1000l");
  process.stdout.write("\x1b[?1006l");
}

function clearOutput() {
  process.stdout.write("\x1b[?1049l");
}

function renderWindow() {
  process.stdout.write("\x1b[H\x1b[2J");
}

//add a test case that the text color should not be reset after the letter color

// handy color palette for future components
