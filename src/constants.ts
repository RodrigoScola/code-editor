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

export const ICONS = {
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
