import { assert } from "../assert.js";
import { InputParser } from "../Input/inputParser.js";
import { EditorContext } from "../Editor/Editor/Editor.js";
import { isStatusWindow, isEditorWindow } from "../utils.js";
import { TextEditorWindow } from "../Editor/windows/TextEditorWindow.js";
import { StatusWindow } from "../Editor/windows/StatusEditor.js";

type Command = (ctx: EditorContext) => void;

type TrieNodeKey = {
  key: string;
  hasControl: boolean;
  hasShift: boolean;
  hasAlt: boolean;
};

function keyId(key: TrieNodeKey): string {
  return [
    key.hasControl ? "C" : "N",
    key.hasShift ? "S" : "N",
    key.hasAlt ? "A" : "N",
    key.key,
  ].join(":");
}

function keyFromBinding(binding: string): TrieNodeKey {
  const match = binding.match(/^<(.+)>$/);

  if (!match) {
    return {
      key: binding,
      hasControl: false,
      hasShift: false,
      hasAlt: false,
    };
  }

  const parts = match[1].split("-");

  const key = parts.pop();

  assert(key, `invalid key binding: ${binding}`);

  return {
    key,
    hasControl: parts.includes("C"),
    hasShift: parts.includes("S"),
    hasAlt: parts.includes("A"),
  };
}

function keyFromEvent(key: KeyEvent): TrieNodeKey {
  return {
    key: key.ctrl ? controlTokenToKey(key.token) : key.token,

    hasControl: key.ctrl,
    hasShift: key.shift,
    hasAlt: key.alt,
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
  children: Map<string, TrieNode> = new Map();
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

      const created = current.children.get(id);

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
    return this;
  }
}

export class VisualMode implements EditorMode {
  keyMap: KeyMapCommands = new KeyMapCommands();

  handleKey(key: KeyEvent, ctx: EditorContext) {
    this.keyMap.handleKey(key, ctx);
  }

  bind(node: string[], command: Command) {
    this.keyMap.bind(node, command);
  }
}

export class CommandMode implements EditorMode {
  commands: Map<string, Command> = new Map();

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
    const window = ctx.getActiveWindow();

    if (!window) {
      return;
    }

    isStatusWindow(window);

    const cursor = window.cursor;
    const buffer = window.buffer;

    if (InputParser.isSpace(key.token) || InputParser.isCharacter(key.token)) {
      const valid = key.shift ? key.token.toUpperCase() : key.token;

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
      const previousWindow = ctx.windowManager.previousWindow();

      if (previousWindow) {
        ctx.focus(previousWindow);
      }

      this.executeCommand(buffer.at(buffer.count() - 1) || "", ctx);

      const statusWindow = ctx.findWindow(StatusWindow);

      if (statusWindow) {
        statusWindow.onEvent({
          name: "submitCommand",
        });
      }

      ctx.setMode("normal");
    } else if (InputParser.isArrowDown(key.token)) {
      window.nextCommandLine();
    } else if (InputParser.isArrowUp(key.token)) {
      window.previousCommandLine();
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
    const window = ctx.getActiveWindow();

    if (!window) {
      return;
    }

    isEditorWindow(window);

    const cursor = window.cursor;
    const buffer = window.buffer;

    if (InputParser.isSpace(key.token) || InputParser.isCharacter(key.token)) {
      if (key.token === "h" && key.ctrl) {
        cursor.column -= 1;
        cursor.prefferedColumn = cursor.column;

        buffer.remove(cursor.line, cursor.column);

        return;
      }

      const valid = key.shift ? key.token.toUpperCase() : key.token;

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
