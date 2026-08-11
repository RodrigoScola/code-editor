import readline from "readline";

export const DEFAULT_TOKENS = {
  RETURN: "<CR>",
  ESCAPE: "<Esc>",
  BACKSPACE: "<BS>",
  DELETE: "<Del>",
  TAB: "<Tab>",
  SPACE: " ",
  UP: "<Up>",
  DOWN: "<Down>",
  LEFT: "<Left>",
  RIGHT: "<Right>",
  HOME: "<Home>",
  END: "<End>",
  PAGE_UP: "<PageUp>",
  PAGE_DOWN: "<PageDown>",
} as const;
const SPECIAL_TOKENS = new Set(Object.values(DEFAULT_TOKENS));

export abstract class InputParser {
  static isEnter(str: string): boolean {
    return str === DEFAULT_TOKENS.RETURN;
  }

  static isEscape(str: string): boolean {
    return str === DEFAULT_TOKENS.ESCAPE;
  }

  static isBackspace(str: string): boolean {
    return str === DEFAULT_TOKENS.BACKSPACE;
  }

  static isDelete(str: string): boolean {
    return str === DEFAULT_TOKENS.DELETE;
  }

  static isTab(str: string): boolean {
    return str === DEFAULT_TOKENS.TAB;
  }

  static isSpace(str: string): boolean {
    return str === DEFAULT_TOKENS.SPACE;
  }

  static isArrowUp(str: string): boolean {
    return str === DEFAULT_TOKENS.UP;
  }

  static isArrowDown(str: string): boolean {
    return str === DEFAULT_TOKENS.DOWN;
  }

  static isArrowLeft(str: string): boolean {
    return str === DEFAULT_TOKENS.LEFT;
  }

  static isArrowRight(str: string): boolean {
    return str === DEFAULT_TOKENS.RIGHT;
  }

  static isHome(str: string): boolean {
    return str === DEFAULT_TOKENS.HOME;
  }

  static isEnd(str: string): boolean {
    return str === DEFAULT_TOKENS.END;
  }

  static isPageUp(str: string): boolean {
    return str === DEFAULT_TOKENS.PAGE_UP;
  }

  static isPageDown(str: string): boolean {
    return str === DEFAULT_TOKENS.PAGE_DOWN;
  }
  static isSpecialToken(str: string): boolean {
    //@ts-ignore
    return SPECIAL_TOKENS.has(str);
  }

  static isCharacter(str: string): boolean {
    //@ts-ignore
    return !SPECIAL_TOKENS.has(str);
  }

  static ParseKey(str: string, key: readline.Key): KeyEvent {
    let token: string;

    switch (key.name) {
      case "return":
        token = DEFAULT_TOKENS.RETURN;
        break;

      case "escape":
        token = DEFAULT_TOKENS.ESCAPE;
        break;

      case "backspace":
        token = key.ctrl ? "h" : DEFAULT_TOKENS.BACKSPACE;
        break;

      case "delete":
        token = DEFAULT_TOKENS.DELETE;
        break;

      case "tab":
        token = DEFAULT_TOKENS.TAB;
        break;

      case "space":
        token = DEFAULT_TOKENS.SPACE;
        break;

      case "up":
        token = DEFAULT_TOKENS.UP;
        break;

      case "down":
        token = DEFAULT_TOKENS.DOWN;
        break;

      case "left":
        token = DEFAULT_TOKENS.LEFT;
        break;

      case "right":
        token = DEFAULT_TOKENS.RIGHT;
        break;

      case "home":
        token = DEFAULT_TOKENS.HOME;
        break;

      case "end":
        token = DEFAULT_TOKENS.END;
        break;

      case "pageup":
        token = DEFAULT_TOKENS.PAGE_UP;
        break;

      case "pagedown":
        token = DEFAULT_TOKENS.PAGE_DOWN;
        break;

      default:
        token = key.name ?? str;
    }

    return {
      token,
      ctrl: !!key.ctrl,
      alt: !!key.meta,
      shift: !!key.shift,
    };
  }
}
