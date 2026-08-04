import readline from "readline";
import { Mode } from "node:fs";
import { assert } from "../assert.js";
import { EditorContext } from "../ui/Editor.js";
import { EditorComponent } from "../ui/EditorComponent.js";
import { isTextEditor } from "../utils.js";
import { log } from "../log.js";

type Command = (ctx: EditorContext) => void;

class TrieNode {
  children: Map<string, TrieNode> = new Map<string, TrieNode>();

  command?: Command;
}

export class KeyMapCommands {
  private root: TrieNode = new TrieNode();
  private current = this.root;

  bind(node: string[], command: Command) {
    let current = this.root;

    for (let i = 0; i < node.length; i++) {
      if (!current.children.has(node[i])) {
        current.children.set(node[i], new TrieNode());
      }
      let created = current.children.get(node[i]);
      assert(created, "invalid node created");
      current = created;
    }
    current.command = command;
  }
  handleKey(key: string | undefined, ctx: EditorContext) {
    if (!key) {
      return;
    }
    const next = this.current.children.get(key);

    if (!next) {
      this.reset();

      const retry = this.current.children.get(key);

      if (!retry) {
        return;
      }
      this.current = retry;
    } else {
      this.current = next;
    }

    if (this.current.command) {
      this.current.command(ctx);
      this.reset();
    }
  }
  reset() {
    this.current = this.root;
  }
}

export class NormalMode implements EditorMode {
  keyMap: KeyMapCommands = new KeyMapCommands();

  handleKey(key: string, ctx: EditorContext) {
    this.keyMap.handleKey(key, ctx);
  }
  bind(node: string[], command: Command) {
    this.keyMap.bind(node, command);
  }
}

export class InsertMode implements EditorMode {
  handleKey(key: string, ctx: EditorContext) {
    if (!ctx.activeWindow) {
      return;
    }

    isTextEditor(ctx.activeWindow);

    const cursor = ctx.activeWindow.cursor;
    const buffer = ctx.activeWindow.buffer;


    if (key === '\r') {

      buffer.newLine()
    }


    buffer.add(cursor.line, cursor.column, key);
    cursor.column += 1;
    cursor.prefferedColumn = cursor.column;
  }
}
