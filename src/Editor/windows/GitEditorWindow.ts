import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { EditorContext } from "../Editor.js";
import { EditorWindow } from "./EditorWindow.js";

import cp from "child_process";

export class GitEditorWindow extends EditorWindow {
  constructor() {
    super();

    const shell =
      process.platform === "win32" ? "cmd.exe" : process.env.SHELL || "/bin/sh";

    const child = cp.spawn(shell, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (data: Buffer) => {
      this.buffer.addLine(data.toString());
    });

    // child.stderr.on("data", (data: Buffer) => {
    //   this.buffer.addLine(data.toString());
    // });

    // child.on("error", (error) => {
    //   this.buffer.addLine(error.toString());
    // });

    setTimeout(() => {
      child.stdin.write("ls\r\n");
    }, 100);
  }
}
