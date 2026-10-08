// Hot reload: recompiles on save and restarts the editor.
//
//   npm run dev                   run it in a terminal
//   "Hot Reload" launch config    same, with the debugger attached to every restart
//
// The editor owns the terminal (raw mode, mouse tracking), so `tsc --watch`
// can't print next to it. Instead this script drives the compiler itself and
// restarts the editor after every clean build. A build with errors stops the
// editor and prints them; the next clean save brings it back.
//
// Quitting the editor (:q) ends the dev session too.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "dist", "index.js");

// undo the terminal modes the editor turns on (see setup.terminal in
// setupEditor.ts), since a killed editor never gets to run its exit handler
const RESET_TERMINAL =
  "\x1b[<u" + // keyboard protocol off
  "\x1b[?1000l\x1b[?1002l\x1b[?1006l" + // mouse tracking off
  "\x1b[0m"; // colors back to default
const CLEAR_SCREEN = "\x1b[2J\x1b[H";

/** @type {import("node:child_process").ChildProcess | null} */
let app = null;
// builds can finish faster than the editor stops, so handle them one at a time
let queue = Promise.resolve();

function startApp() {
  process.stdout.write(CLEAR_SCREEN);
  const child = spawn(process.execPath, [entry], { stdio: "inherit" });
  app = child;

  child.on("exit", (code, signal) => {
    if (app !== child) return; // we stopped it to restart, nothing to report
    app = null;
    restoreTerminal();

    if (code === 0) {
      process.stdout.write(CLEAR_SCREEN);
      process.exit(0);
    }
    log(
      `editor exited (${signal ?? `code ${code}`}). ` +
        `Save a file to restart it, Ctrl+C to quit.`,
    );
  });
}

function stopApp() {
  const child = app;
  if (!child) return Promise.resolve();
  app = null;

  return new Promise((resolve) => {
    child.once("exit", () => {
      restoreTerminal();
      resolve();
    });
    child.kill();
  });
}

function restoreTerminal() {
  process.stdout.write(RESET_TERMINAL);
  if (process.stdin.isTTY) {
    // the editor leaves the console in raw mode, where Ctrl+C is just a key.
    // node skips setRawMode calls that match what it last set itself, so go
    // through raw to make it actually switch back
    process.stdin.setRawMode(true);
    process.stdin.setRawMode(false);
  }
}

function log(message) {
  process.stdout.write(`\n[dev] ${message}\n`);
}

/** @type {ts.Diagnostic[]} */
const diagnostics = [];

const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

function onBuildFinished(errorCount) {
  const errors = diagnostics.splice(0);

  queue = queue.then(async () => {
    await stopApp();

    if (errorCount === 0) {
      startApp();
      return;
    }
    process.stdout.write(CLEAR_SCREEN);
    process.stdout.write(
      ts.formatDiagnosticsWithColorAndContext(errors, formatHost),
    );
    log(
      `${errorCount} error${errorCount === 1 ? "" : "s"}. ` +
        `Fix and save to restart, Ctrl+C to quit.`,
    );
  });
}

const host = ts.createWatchCompilerHost(
  path.join(root, "tsconfig.json"),
  {},
  ts.sys,
  ts.createEmitAndSemanticDiagnosticsBuilderProgram,
  (diagnostic) => diagnostics.push(diagnostic),
  (_status, _newLine, _options, errorCount) => {
    // only the "Found N errors" status carries a count; the others announce
    // that a build is starting
    if (errorCount === undefined) {
      diagnostics.length = 0;
      return;
    }
    onBuildFinished(errorCount);
  },
);

log("building...");
ts.createWatchProgram(host);

function shutdown() {
  app?.kill();
  restoreTerminal();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// never leave an editor running behind us if this script dies
process.on("exit", () => app?.kill());
