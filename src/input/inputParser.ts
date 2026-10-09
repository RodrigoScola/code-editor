type MouseInputKind = "mouse";
type KeyboardInputKind = "keyboard";

type InputEventKind = MouseInputKind | KeyboardInputKind;
type MouseButtons = "left" | "middle" | "right" | null;
type MouseAction =
  | "press"
  | "release"
  | "drag"
  | "move"
  | "wheelUp"
  | "wheelDown";

export interface MouseEvent {
  kind: MouseInputKind;
  action: MouseAction;
  button: MouseButtons;
  position: Point;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

export interface KeyEvent {
  token: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

export type InputEvent =
  | {
      type: MouseInputKind;
      event: MouseEvent;
    }
  | {
      type: KeyboardInputKind;
      event: KeyEvent;
    };

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

  static parse(chunk: Buffer | string): InputEvent[] {
    const events: InputEvent[] = [];
    const pushKey = (event: KeyEvent) => {
      events.push({ type: "keyboard", event });
    };

    /*
     * If another layer has already converted the input into a
     * terminal token, handle that token directly.
     */
    if (typeof chunk === "string") {
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
          pushKey({
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
            if (sequence.event) {
              events.push(sequence.event);
            }
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

          pushKey({
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
        pushKey({
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
        pushKey({
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
        pushKey({
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

        pushKey({
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

        pushKey({
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

  /*
   * Parses a CSI sequence starting at chunk[start] (ESC) / chunk[start + 1] ([).
   *
   * Layout:  ESC [ <params 0x30-0x3f> <intermediates 0x20-0x2f> <final 0x40-0x7e>
   *
   * The whole sequence is always consumed. Sequences we don't understand come
   * back with a null event so they are dropped instead of leaking into the
   * input as Alt+[ followed by stray characters.
   */
  private static parseEscapeSequence(
    chunk: Buffer,
    start: number,
  ): {
    event: InputEvent | null;
    nextIndex: number;
  } | null {
    let end = start + 2;

    while (end < chunk.length && chunk[end] >= 0x20 && chunk[end] <= 0x3f) {
      end++;
    }

    // incomplete or malformed: let the caller treat ESC on its own
    if (end >= chunk.length || chunk[end] < 0x40 || chunk[end] > 0x7e) {
      return null;
    }

    const params = chunk.toString("latin1", start + 2, end);
    const final = String.fromCharCode(chunk[end]);
    const nextIndex = end + 1;

    // SGR mouse: ESC [ < b ; x ; y (M = press, m = release)
    if (params.startsWith("<")) {
      const event = this.parseSgrMouse(params.slice(1), final);

      return { event: event && { type: "mouse", event }, nextIndex };
    }

    const [first = "", second = ""] = params.split(";");
    const mods = this.parseModifiers(second);

    // kitty keyboard protocol: ESC [ codepoint ; modifiers u
    if (final === "u") {
      const event = this.parseKittyKey(Number(first.split(":")[0]), mods);

      return { event: this.keyboard(event), nextIndex };
    }

    // arrows / home / end, optionally with modifiers: ESC [ 1 ; 5 A
    const letterKeys: Record<string, string> = {
      A: DEFAULT_TOKENS.UP,
      B: DEFAULT_TOKENS.DOWN,
      C: DEFAULT_TOKENS.RIGHT,
      D: DEFAULT_TOKENS.LEFT,
      H: DEFAULT_TOKENS.HOME,
      F: DEFAULT_TOKENS.END,
    };

    if (final in letterKeys) {
      return {
        event: this.keyboard({ token: letterKeys[final], ...mods }),
        nextIndex,
      };
    }

    // ESC [ n ~ keys (terminals disagree on home/end, so accept both codes)
    if (final === "~") {
      const tildeKeys: Record<string, string> = {
        "1": DEFAULT_TOKENS.HOME,
        "7": DEFAULT_TOKENS.HOME,
        "4": DEFAULT_TOKENS.END,
        "8": DEFAULT_TOKENS.END,
        "3": DEFAULT_TOKENS.DELETE,
        "5": DEFAULT_TOKENS.PAGE_UP,
        "6": DEFAULT_TOKENS.PAGE_DOWN,
      };
      const token = tildeKeys[first];

      return {
        event: this.keyboard(token ? { token, ...mods } : null),
        nextIndex,
      };
    }

    return { event: null, nextIndex };
  }

  private static keyboard(event: KeyEvent | null): InputEvent | null {
    return event && { type: "keyboard", event };
  }

  /*
   * xterm encodes modifiers as 1 + bitmask (shift = 1, alt = 2, ctrl = 4).
   */
  private static parseModifiers(param: string) {
    const mask = Math.max(0, (Number(param.split(":")[0]) || 1) - 1);

    return {
      shift: (mask & 1) !== 0,
      alt: (mask & 2) !== 0,
      ctrl: (mask & 4) !== 0,
    };
  }

  private static parseKittyKey(
    codepoint: number,
    mods: { shift: boolean; alt: boolean; ctrl: boolean },
  ): KeyEvent | null {
    if (!Number.isFinite(codepoint)) {
      return null;
    }

    const special: Record<number, string> = {
      9: DEFAULT_TOKENS.TAB,
      13: DEFAULT_TOKENS.RETURN,
      27: DEFAULT_TOKENS.ESCAPE,
      127: DEFAULT_TOKENS.BACKSPACE,
    };

    if (codepoint in special) {
      return { token: special[codepoint], ...mods };
    }

    // kitty reports the unshifted key, match what the legacy path produces
    const character = String.fromCodePoint(codepoint);

    return {
      ...mods,
      token: mods.shift ? character.toUpperCase() : character,
    };
  }

  private static parseSgrMouse(
    params: string,
    final: string,
  ): MouseEvent | null {
    const [b, x, y] = params.split(";").map(Number);

    if (![b, x, y].every(Number.isFinite)) {
      return null;
    }

    const base = {
      kind: "mouse" as const,
      // terminal coordinates are 1-based
      position: { x: x - 1, y: y - 1 },
      shift: (b & 4) !== 0,
      alt: (b & 8) !== 0,
      ctrl: (b & 16) !== 0,
    };

    if (b & 64) {
      return {
        ...base,
        action: (b & 1) === 0 ? "wheelUp" : "wheelDown",
        button: null,
      };
    }

    const buttons = ["left", "middle", "right"] as const;
    // 3 = no button held (plain motion with ?1003h)
    const button = buttons[b & 3] ?? null;

    let action: MouseAction;
    if (b & 32) {
      action = button ? "drag" : "move";
    } else {
      action = final === "M" ? "press" : "release";
    }

    return { ...base, action, button };
  }
}
