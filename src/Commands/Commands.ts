import { assert } from "../assert.js";
import { InputParser } from "../Input/inputParser.js";
import { EditorContext } from "../Editor/Editor.js";
import { isStatusWindow, isEditorWindow } from "../utils.js";

type Command = (ctx: EditorContext) => void;

type TrieNodeKey = {
  key: string;
  hasControl: boolean;
};

function keyId(key: TrieNodeKey): string {
  return `${key.hasControl ? "C" : "N"}:${key.key}`;
}

function keyFromBinding(binding: string): TrieNodeKey {
  const controlKey = binding.match(/^<C-(.+)>$/);

  if (controlKey) {
    return {
      hasControl: true,
      key: controlKey[1],
    };
  }

  return {
    hasControl: false,
    key: binding,
  };
}

function keyFromEvent(key: KeyEvent): TrieNodeKey {
  if (!key.ctrl) {
    return {
      hasControl: false,
      key: key.token,
    };
  }

  return {
    hasControl: true,
    key: controlTokenToKey(key.token),
  };
}

function controlTokenToKey(token: string): string {
  if (token.length === 1) {
    const code = token.charCodeAt(0);
    if (code >= 1 && code <= 26) {
      return String.fromCharCode(code + 96);
    }
  }

  return token;
}

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
      const parsed = keyFromBinding(node[i]);
      const id = keyId(parsed);
      if (!current.children.has(id)) {
        current.children.set(id, new TrieNode());
      }
      let created = current.children.get(id);
      assert(created, "invalid node created");
      current = created;
    }
    current.command = command;
  }
  handleKey(key: KeyEvent | undefined, ctx: EditorContext) {
    if (!key) {
      return;
    }
    const parsed = keyFromEvent(key);
    const id = keyId(parsed);
    const next = this.current.children.get(id);

    if (!next) {
      this.reset();

      const retry = this.current.children.get(id);

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

  handleKey(key: KeyEvent, ctx: EditorContext) {
    this.keyMap.handleKey(key, ctx);
  }
  bind(node: string[], command: Command) {
    this.keyMap.bind(node, command);
  }
}

export class CommandMode implements EditorMode {
  commands: Map<string, Command> = new Map<string, Command>();

  bind(name: string, command: Command) {
    this.commands.set(name, command);
  }

  executeCommand(name: string, ctx: EditorContext) {
    const command = this.commands.get(name);
    if (!command) {
      return;
    }
    command(ctx);
  }

  handleKey(key: KeyEvent, ctx: EditorContext) {
    if (!ctx.activeWindow) {
      return;
    }

    isStatusWindow(ctx.activeWindow);

    const cursor = ctx.activeWindow.cursor;
    const buffer = ctx.activeWindow.buffer;

    if (InputParser.isSpace(key.token) || InputParser.isCharacter(key.token)) {
      let valid = key.shift ? key.token.toUpperCase() : key.token;
      buffer.addCharacter(cursor.line, cursor.column, valid);
      cursor.column += 1;
      cursor.prefferedColumn = cursor.column;
    } else if (InputParser.isEscape(key.token)) {
      ctx.setMode("normal");
    } else if (InputParser.isBackspace(key.token)) {
      cursor.column -= 1;
      cursor.prefferedColumn = cursor.column;
      buffer.remove(cursor.line, cursor.column);
    } else if (InputParser.isDelete(key.token)) {
      buffer.remove(cursor.line, cursor.column);
    } else if (InputParser.isEnter(key.token)) {
      // todo: execute the command

      ctx.focusTextWindow();
      this.executeCommand(buffer.at(buffer.count() - 1) || "", ctx);

      if (ctx.statusWindow) {
        ctx.statusWindow.onEvent({ name: "submitCommand" });
      }

      ctx.setMode("normal");
    } else if (InputParser.isArrowDown(key.token)) {
      ctx.activeWindow.nextCommandLine();
    } else if (InputParser.isArrowUp(key.token)) {
      ctx.activeWindow.previousCommandLine();
    } else if (InputParser.isArrowLeft(key.token)) {
      cursor.moveLeft(buffer);
    } else if (InputParser.isArrowRight(key.token)) {
      cursor.moveRight(buffer);
    } else if (InputParser.isTab(key.token)) {
      buffer.addCharacter(cursor.line, cursor.column, "\t");
      cursor.column += 1;
      cursor.prefferedColumn = cursor.column;
    }
  }
}

export class InsertMode implements EditorMode {
  handleKey(key: KeyEvent, ctx: EditorContext) {
    if (!ctx.activeWindow) {
      return;
    }

    isEditorWindow(ctx.activeWindow);

    const cursor = ctx.activeWindow.cursor;
    const buffer = ctx.activeWindow.buffer;

    if (InputParser.isSpace(key.token) || InputParser.isCharacter(key.token)) {
      if (key.token === "h" && key.ctrl) {
        cursor.column -= 1;
        cursor.prefferedColumn = cursor.column;
        buffer.remove(cursor.line, cursor.column);
        return;
      }
      let valid = key.shift ? key.token.toUpperCase() : key.token;
      buffer.addCharacter(cursor.line, cursor.column, valid);
      cursor.column += 1;
      cursor.prefferedColumn = cursor.column;
    } else if (InputParser.isEscape(key.token)) {
      ctx.setMode("normal");
    } else if (InputParser.isBackspace(key.token)) {
      cursor.column -= 1;
      cursor.prefferedColumn = cursor.column;
      buffer.remove(cursor.line, cursor.column);
    } else if (InputParser.isDelete(key.token)) {
      buffer.remove(cursor.line, cursor.column);
    } else if (InputParser.isEnter(key.token)) {
      // todo: need to add more edge cases, very buggy
      buffer.newLine();
      cursor.moveDown(buffer);
    } else if (InputParser.isArrowDown(key.token)) {
      cursor.moveDown(buffer);
    } else if (InputParser.isArrowUp(key.token)) {
      cursor.moveUp(buffer);
    } else if (InputParser.isArrowLeft(key.token)) {
      cursor.moveLeft(buffer);
    } else if (InputParser.isArrowRight(key.token)) {
      cursor.moveRight(buffer);
    } else if (InputParser.isTab(key.token)) {
      buffer.addCharacter(cursor.line, cursor.column, "\t");
      cursor.column += 1;
      cursor.prefferedColumn = cursor.column;
    }
  }
}
