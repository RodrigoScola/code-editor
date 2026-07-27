import process from "process";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent, TextDisplay } from "./ui/components.js";
import colors from "./ui/colors.js";

enableMouseEvents();

const cnv = new Canvas();

const editorWindow = new DisplayComponent(cnv);
const commandWindow = new DisplayComponent(cnv);
editorWindow.styles.backgroundColor = colors.MAGENTA_BACKGROUND;
commandWindow.styles.backgroundColor = colors.YELLOW_BACKGROUND;

cnv.addChildren([editorWindow, commandWindow]);

const textEditor = new TextDisplay(editorWindow);

editorWindow.addChildren(textEditor);

textEditor.setText("this is working?");

commandWindow.setMaxH(1);

// setupActiveEditorFrame(state);
// setupCommandWindow(state);
// renderWindow(state);

cnv.setHeight(process.stdout.rows);
cnv.setWidth(process.stdout.columns);
cnv.build();

process.stdout.write(cnv.render());

process.stdin.on("data", () => {
  cnv.build();
  process.stdout.write(cnv.render());
  // renderWindow(state);
});

process.stdout.on("resize", () => {
  clearOutput();
  cnv.setHeight(process.stdout.rows);
  cnv.setWidth(process.stdout.columns);

  cnv.build();
  process.stdout.write(cnv.render());
});

process.stdout.on("finish", () => {
  // clearOutput();
  // disableMouseEvents();
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
