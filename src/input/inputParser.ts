import { InputEvent } from "./TerminalInputParser.js";

export const DEFAULT_TOKENS = {
  RETURN: "<CR>",
  ENTER: "<CR>",
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
  PAGEUP: "<PageUp>",
  PAGEDOWN: "<PageDown>",
} as const;

const SPECIAL_TOKENS = new Set(Object.values(DEFAULT_TOKENS));

const DEFAULT_KEYS = new Map<string, string>();

for (const key of Object.keys(DEFAULT_TOKENS)) {
  //@ts-expect-error ts is annoying
  DEFAULT_KEYS.set(key.toLowerCase(), DEFAULT_TOKENS[key]);
}

export class InputParser {
  static isEnter(token: string): boolean {
    return token === DEFAULT_TOKENS.RETURN;
  }

  static isEscape(token: string): boolean {
    return token === DEFAULT_TOKENS.ESCAPE;
  }

  static isBackspace(token: string): boolean {
    return token === DEFAULT_TOKENS.BACKSPACE;
  }

  static isDelete(token: string): boolean {
    return token === DEFAULT_TOKENS.DELETE;
  }

  static isTab(token: string): boolean {
    return token === DEFAULT_TOKENS.TAB;
  }

  static isSpace(token: string): boolean {
    return token === DEFAULT_TOKENS.SPACE || token === "space";
  }
  static isArrow(token: string) {
    return (
      InputParser.isArrowDown(token) ||
      InputParser.isArrowUp(token) ||
      InputParser.isArrowLeft(token) ||
      InputParser.isArrowRight(token)
    );
  }
  static isArrowUp(token: string): boolean {
    return token === DEFAULT_TOKENS.UP;
  }

  static isArrowDown(token: string): boolean {
    return token === DEFAULT_TOKENS.DOWN;
  }

  static isArrowLeft(token: string): boolean {
    return token === DEFAULT_TOKENS.LEFT;
  }

  static isArrowRight(token: string): boolean {
    return token === DEFAULT_TOKENS.RIGHT;
  }

  static isHome(token: string): boolean {
    return token === DEFAULT_TOKENS.HOME;
  }

  static isEnd(token: string): boolean {
    return token === DEFAULT_TOKENS.END;
  }

  static isPageUp(token: string): boolean {
    return token === DEFAULT_TOKENS.PAGEUP;
  }

  static isPageDown(token: string): boolean {
    return token === DEFAULT_TOKENS.PAGEDOWN;
  }
  static ToToken(token: string): string {
    if (DEFAULT_KEYS.has(token.toLowerCase())) {
      return DEFAULT_KEYS.get(token.toLowerCase())!;
    }
    return token;
  }
  static IsDigit(token: string): boolean {
    return Number.isFinite(Number(token));
  }

  static isSpecialToken(token: string): boolean {
    //@ts-ignore
    return SPECIAL_TOKENS.has(token) || DEFAULT_KEYS.has(token.toLowerCase());
  }

  static isCharacter(token: string): boolean {
    //@ts-ignore
    return token.length === 1 && /[a-zA-Z]/.test(token);
  }

  // one punctuation or symbol character: ( # @ $ + ~ ...
  // letters, digits, spaces and named tokens like "<CR>" are not symbols
  static isSymbol(token: string): boolean {
    return token.length === 1 && /[\p{P}\p{S}]/u.test(token);
  }

  static FromString(chunk: string): InputEvent[] {
    switch (chunk) {
      case DEFAULT_TOKENS.RETURN:
        return [
          {
            type: "keyboard",
            event: {
              token: DEFAULT_TOKENS.RETURN,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
        ];

      case DEFAULT_TOKENS.ESCAPE:
        return [
          {
            type: "keyboard",
            event: {
              token: DEFAULT_TOKENS.ESCAPE,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
        ];

      case DEFAULT_TOKENS.BACKSPACE:
        return [
          {
            type: "keyboard",
            event: {
              token: DEFAULT_TOKENS.BACKSPACE,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
        ];

      case DEFAULT_TOKENS.DELETE:
        return [
          {
            type: "keyboard",
            event: {
              token: DEFAULT_TOKENS.DELETE,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
        ];

      case DEFAULT_TOKENS.TAB:
        return [
          {
            type: "keyboard",
            event: {
              token: DEFAULT_TOKENS.TAB,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
        ];
    }
    return [];
  }
}
