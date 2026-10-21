import { setupEditor as setup } from "./setupEditor.js";
import { TerminalInputParser } from "../../Input/terminal/TerminalInputParser.js";
import { LayoutEngine } from "../../ui/layout/layout.js";
import { TerminalRenderer } from "../../ui/Renderers/TerminalRenderer.js";
import { EditorContext } from "../EditorContext.js";
import { ErrorWindow } from "../windows/ErrorWindow.js";

export function setupTerminal(editor: EditorContext) {
  hideCursor();

  disableMouseEvents();
  enableKeyboardProtocol();
  enableMouseEvents();
  process.stdout.on("resize", () => handleResize(editor));

  process.stdout.on("finish", () => {
    clearOutput();
    disableMouseEvents();
  });
  process.stdin.on("data", (chunk) => {
    for (const input of TerminalInputParser.parse(chunk)) {
      if (input.type === "keyboard") {
        editor.handleKey(input.event);
      }
      // todo: mouse events are parsed but not dispatched yet
    }
  });

  process.on("exit", () => {
    disableKeyboardProtocol();
    disableMouseEvents();
    showCursor();
  });

  if (editor.renderer.isTerminalRenderer()) {
    (editor.renderer as TerminalRenderer).setOutput((frame) => {
      if (frame) {
        process.stdout.write(frame);
      }
    });
  }

  // the editor is the whole terminal, in cells
  const bounds = LayoutEngine.CreateBounds()
    .setHeight(process.stdout.rows)
    .setWidth(process.stdout.columns);
  editor.renderer.setLayout(bounds);

  errorsOnScreen(editor);
}

function disableMouseEvents() {
  process.stdout.write("\x1b[?1000l");
  process.stdout.write("\x1b[?1006l");
}
function enableMouseEvents() {
  process.stdout.write("\x1b[?1000h"); // press/release
  process.stdout.write("\x1b[?1002h"); // drag (motion while a button is held)
  process.stdout.write("\x1b[?1006h"); // SGR format: no 223-column limit, tells press from release
}

function clearOutput() {
  process.stdout.write("\x1b[?1049l");
}

function hideCursor() {
  process.stdout.write("\x1b[?25l");
}
function showCursor() {
  process.stdout.write("\x1b[?25h");
}

export function enableKeyboardProtocol() {
  process.stdout.write("\x1b[>1u");
}

export function disableKeyboardProtocol() {
  process.stdout.write("\x1b[<u");
}
async function handleResize(
  editor: EditorContext,
  size?: { columns: number; rows: number },
) {
  const resolved = size ??
    (await queryTerminalSize()) ?? {
      columns: process.stdout.columns,
      rows: process.stdout.rows,
    };

  clearOutput();
  const resizedLayout = LayoutEngine.CreateBounds();
  resizedLayout.setHeight(resolved.rows).setWidth(resolved.columns);
  editor.setLayout(resizedLayout);
  editor.rootWindow.layoutConstraints = LayoutEngine.CreateConstraints(
    resizedLayout.width,
    resizedLayout.height,
  );

  editor.rootWindow.setLayout(resizedLayout);

  // the terminal moved its text around while resizing, so the next frame
  // can't build on what it sent before
  editor.renderer.invalidate();
  editor.requestRepaint();
}
function queryTerminalSize(
  timeoutMs = 150,
): Promise<{ columns: number; rows: number } | null> {
  return new Promise((resolve) => {
    let settled = false;
    let buffer = Buffer.alloc(0);

    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      const match = buffer.toString("utf8").match(/\x1b\[(\d+);(\d+)R/);

      if (!match) {
        return;
      }

      const rows = Number(match[1]);
      const columns = Number(match[2]);

      settle({
        rows,
        columns,
      });
    };

    const timer = setTimeout(() => {
      settle(null);
    }, timeoutMs);

    function settle(result: { columns: number; rows: number } | null) {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);
      process.stdin.off("data", onData);

      process.stdout.write("\x1b[u");

      resolve(result);
    }

    process.stdin.on("data", onData);

    process.stdout.write("\x1b[s" + "\x1b[999;999H" + "\x1b[6n");
  });
}
function errorsOnScreen(ctx: EditorContext) {
  // from here on, errors go to the log window instead of killing the editor.
  // registered after setup on purpose: a startup failure should still crash
  // loudly rather than leave a half-built screen
  function reportError(kind: string, err: unknown) {
    const detail =
      err instanceof Error ? (err.stack ?? err.message) : String(err);

    try {
      const errorWindow = ctx.findWindow(ErrorWindow);
      if (!errorWindow) {
        console.error(`could not find error window for error`);
        console.error(detail);
        return;
      }

      errorWindow.showError(`${kind} \n ${detail} \n${err}`);
      ctx.requestRepaint();
    } catch {
      // an error thrown inside this handler would exit the process, so if
      // logging itself fails there is nothing left to do but drop it
    }
  }

  process.on("uncaughtException", (err) => reportError("uncaught", err));
  process.on("unhandledRejection", (reason) =>
    reportError("unhandled rejection", reason),
  );
}
