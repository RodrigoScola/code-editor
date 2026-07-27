

enableMouseEvents();

// setupActiveEditorFrame(state);
// setupCommandWindow(state);
// renderWindow(state);

process.stdin.on("data", () => {
  // renderWindow(state);
});

process.stdout.on("resize", () => {
  // resizeEditor(state);
  // renderWindow(state);
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
