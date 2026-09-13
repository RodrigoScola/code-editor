export const WINDOW_NAMES = {
  STATUS_WINDOW: "status_window",
  EDITOR_TEXT_WINDOW: "EDITOR_TEXT_WINDOW",
  TREE_WINDOW: "EDITOR_TREE_WINDOW",
  GIT_WINDOW: "GIT_WINDOW",
} as const;

export const POSITION_ORDER: Record<PositionMode, number> = {
  normal: 0,
  absolute: 1,
  fixed: 2,
};

const heavy_border: BorderDisplay = {
  top_right: "┓",
  top_left: "┏",
  bottom_right: "┛",
  bottom_left: "┗",
  left: "┃",
  right: "┃",
  top: "━",
  bottom: "━",
};

const light_border: BorderDisplay = {
  top_right: "┐",
  top_left: "┌",
  bottom_right: "┘",
  bottom_left: "└",
  left: "│",
  right: "│",
  top: "─",
  bottom: "─",
};
const double_border: BorderDisplay = {
  top_right: "╗",
  top_left: "╔",
  bottom_right: "╝",
  bottom_left: "╚",
  left: "║",
  right: "║",
  top: "═",
  bottom: "═",
};
const round_border: BorderDisplay = {
  top_right: "╮",
  top_left: "╭",
  bottom_right: "╯",
  bottom_left: "╰",
  left: "│",
  right: "│",
  top: "─",
  bottom: "─",
};

const full_border: BorderDisplay = {
  top_right: "█",
  top_left: "█",
  bottom_right: "█",
  bottom_left: "█",
  left: "█",
  right: "█",
  top: "▀",
  bottom: "▄",
};

export const ICONS = {
  borders: {
    heavy: heavy_border,
    light: light_border,
    double: double_border,
    round: round_border,
    full: full_border,
  },
  arrow: {
    left: "←",
    right: "→",
    up: "↑",
    down: "↓",
    upLeft: "↖",
    upRight: "↗",
    downRight: "↘",
    downLeft: "↙",
    leftRight: "↔",
    upDown: "↕",
    doubleLeft: "⇐",
    doubleRight: "⇒",
    doubleUp: "⇑",
    doubleDown: "⇓",
    doubleLr: "⇔",
    doubleUd: "⇕",
    returnLeft: "↩",
    returnRight: "↪",
    arcUp: "⤴",
    arcDown: "⤵",
    triangleUp: "▲",
    triangleDown: "▼",
    triangleRight: "▶",
    triangleLeft: "◀",
  },
};
