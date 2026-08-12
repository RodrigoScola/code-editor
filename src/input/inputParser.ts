import { start } from "repl";

export interface KeyEvent {
  token: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

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
    return token === DEFAULT_TOKENS.SPACE;
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
    return token === DEFAULT_TOKENS.PAGE_UP;
  }

  static isPageDown(token: string): boolean {
    return token === DEFAULT_TOKENS.PAGE_DOWN;
  }

  static isSpecialToken(token: string): boolean {
    //@ts-ignore
    return SPECIAL_TOKENS.has(token);
  }

  static isCharacter(token: string): boolean {
    //@ts-ignore
    return !SPECIAL_TOKENS.has(token);
  }

  static parse(chunk: Buffer | string): KeyEvent[] {
    const events: KeyEvent[] = [];

    /*
     * If another layer has already converted the input into a
     * terminal token, handle that token directly.
     */
    if (typeof chunk === "string") {
      switch (chunk) {
        case DEFAULT_TOKENS.RETURN:
          return [
            {
              token: DEFAULT_TOKENS.RETURN,
              ctrl: false,
              alt: false,
              shift: false,
            },
          ];

        case DEFAULT_TOKENS.ESCAPE:
          return [
            {
              token: DEFAULT_TOKENS.ESCAPE,
              ctrl: false,
              alt: false,
              shift: false,
            },
          ];

        case DEFAULT_TOKENS.BACKSPACE:
          return [
            {
              token: DEFAULT_TOKENS.BACKSPACE,
              ctrl: false,
              alt: false,
              shift: false,
            },
          ];

        case DEFAULT_TOKENS.DELETE:
          return [
            {
              token: DEFAULT_TOKENS.DELETE,
              ctrl: false,
              alt: false,
              shift: false,
            },
          ];

        case DEFAULT_TOKENS.TAB:
          return [
            {
              token: DEFAULT_TOKENS.TAB,
              ctrl: false,
              alt: false,
              shift: false,
            },
          ];
      }
    }

    /*
     * From this point onward we work with raw bytes.
     */
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    let i = 0;

    while (i < buffer.length) {
      const byte = buffer[i];

      /*
       * ESC
       */
      if (byte === 0x1b) {
        /*
         * Lone ESC
         */
        if (i + 1 >= buffer.length) {
          events.push({
            token: DEFAULT_TOKENS.ESCAPE,
            ctrl: false,
            alt: false,
            shift: false,
          });

          i++;
          continue;
        }

        /*
         * CSI sequence:
         *
         * ESC [
         */
        if (buffer[i + 1] === 0x5b) {
          const sequence = this.parseEscapeSequence(buffer, i);

          if (sequence) {
            events.push(sequence.event);
            i = sequence.nextIndex;
            continue;
          }
        }

        /*
         * ESC + printable character = Alt + character
         */
        const next = buffer[i + 1];

        if (next >= 0x20 && next <= 0x7e) {
          const character = String.fromCharCode(next);

          events.push({
            token: character.toLowerCase(),
            ctrl: false,
            alt: true,
            shift: character >= "A" && character <= "Z",
          });

          i += 2;
          continue;
        }

        i++;
        continue;
      }

      /*
       * Enter
       *
       * CR = 0x0D
       * LF = 0x0A
       */
      if (byte === 0x0d || byte === 0x0a) {
        events.push({
          token: DEFAULT_TOKENS.RETURN,
          ctrl: false,
          alt: false,
          shift: false,
        });

        i++;
        continue;
      }

      /*
       * Tab
       */
      if (byte === 0x09) {
        events.push({
          token: DEFAULT_TOKENS.TAB,
          ctrl: false,
          alt: false,
          shift: false,
        });

        i++;
        continue;
      }

      /*
       * Backspace
       */
      if (byte === 0x7f) {
        events.push({
          token: DEFAULT_TOKENS.BACKSPACE,
          ctrl: false,
          alt: false,
          shift: false,
        });

        i++;
        continue;
      }

      /*
       * Ctrl+A through Ctrl+Z
       */
      if (byte >= 0x01 && byte <= 0x1a) {
        const character = String.fromCharCode(byte + 0x60);

        events.push({
          token: character,
          ctrl: true,
          alt: false,
          shift: false,
        });

        i++;
        continue;
      }

      /*
       * Printable ASCII
       */
      if (byte >= 0x20 && byte <= 0x7e) {
        const character = String.fromCharCode(byte);

        events.push({
          token: character,
          ctrl: false,
          alt: false,
          shift: character >= "A" && character <= "Z",
        });

        i++;
        continue;
      }

      /*
       * Unknown / unsupported byte.
       */
      i++;
    }

    return events;
  }

  private static parseEscapeSequence(
    chunk: Buffer,
    start: number,
  ): {
    event: KeyEvent;
    nextIndex: number;
  } | null {
    /*
     * We know:
     *
     * chunk[start]     = ESC
     * chunk[start + 1] = [
     */

    if (start + 2 >= chunk.length) {
      return null;
    }

    const code = chunk[start + 2];

    switch (code) {
      case 0x41: // A
        return {
          event: {
            token: DEFAULT_TOKENS.UP,
            ctrl: false,
            alt: false,
            shift: false,
          },
          nextIndex: start + 3,
        };

      case 0x42: // B
        return {
          event: {
            token: DEFAULT_TOKENS.DOWN,
            ctrl: false,
            alt: false,
            shift: false,
          },
          nextIndex: start + 3,
        };

      case 0x43: // C
        return {
          event: {
            token: DEFAULT_TOKENS.RIGHT,
            ctrl: false,
            alt: false,
            shift: false,
          },
          nextIndex: start + 3,
        };

      case 0x44: // D
        return {
          event: {
            token: DEFAULT_TOKENS.LEFT,
            ctrl: false,
            alt: false,
            shift: false,
          },
          nextIndex: start + 3,
        };

      case 0x48: // H
        return {
          event: {
            token: DEFAULT_TOKENS.HOME,
            ctrl: false,
            alt: false,
            shift: false,
          },
          nextIndex: start + 3,
        };

      case 0x46: // F
        return {
          event: {
            token: DEFAULT_TOKENS.END,
            ctrl: false,
            alt: false,
            shift: false,
          },
          nextIndex: start + 3,
        };

      default:
        return null;
    }
  }
}
