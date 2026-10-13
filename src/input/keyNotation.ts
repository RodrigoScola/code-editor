import { DEFAULT_TOKENS, KeyEvent } from "./inputParser.js";

// Turns Vim key notation into key events, so a sequence of keys can be
// written as text:
//
//   parseKeys("dw")          d, w
//   parseKeys("iX<Esc>")     i, X, Escape
//   parseKeys("<C-w>v")      Ctrl+w, v
//
// Plain characters are typed as they are. Named keys: <Esc> <CR> <Enter>
// <BS> <Del> <Tab> <Up> <Down> <Left> <Right> <Home> <End> <PageUp>
// <PageDown> <Space> <lt> (a literal "<"). <C-x> is Ctrl+x. <S-Right> is
// Shift with a named key, the way the terminal parser reports Shift+arrows
// (<S-Home>, <S-End>, <S-Up>, ...). Names are not case sensitive.

const NAMED: Record<string, string> = {
  esc: DEFAULT_TOKENS.ESCAPE,
  cr: DEFAULT_TOKENS.RETURN,
  enter: DEFAULT_TOKENS.RETURN,
  bs: DEFAULT_TOKENS.BACKSPACE,
  del: DEFAULT_TOKENS.DELETE,
  tab: DEFAULT_TOKENS.TAB,
  up: DEFAULT_TOKENS.UP,
  down: DEFAULT_TOKENS.DOWN,
  left: DEFAULT_TOKENS.LEFT,
  right: DEFAULT_TOKENS.RIGHT,
  home: DEFAULT_TOKENS.HOME,
  end: DEFAULT_TOKENS.END,
  pageup: DEFAULT_TOKENS.PAGE_UP,
  pagedown: DEFAULT_TOKENS.PAGE_DOWN,
  space: DEFAULT_TOKENS.SPACE,
  lt: "<",
};

export function parseKeys(sequence: string): KeyEvent[] {
  const keys: KeyEvent[] = [];
  let i = 0;

  while (i < sequence.length) {
    const close = sequence[i] === "<" ? sequence.indexOf(">", i) : -1;
    const name = close === -1 ? "" : sequence.slice(i + 1, close);

    const ctrl = name.match(/^C-(.)$/i);
    if (ctrl) {
      keys.push({
        token: ctrl[1].toLowerCase(),
        ctrl: true,
        alt: false,
        shift: false,
      });
      i = close + 1;
      continue;
    }

    const shifted = name.match(/^S-(.+)$/i);
    const shiftedKey = shifted && NAMED[shifted[1].toLowerCase()];
    if (shiftedKey !== undefined && shiftedKey !== null) {
      keys.push({ token: shiftedKey, ctrl: false, alt: false, shift: true });
      i = close + 1;
      continue;
    }

    const named = NAMED[name.toLowerCase()];
    if (named !== undefined) {
      keys.push({ token: named, ctrl: false, alt: false, shift: false });
      i = close + 1;
      continue;
    }

    const ch = sequence[i];
    keys.push({
      token: ch,
      ctrl: false,
      alt: false,
      shift: ch >= "A" && ch <= "Z",
    });
    i++;
  }

  return keys;
}
