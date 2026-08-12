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
