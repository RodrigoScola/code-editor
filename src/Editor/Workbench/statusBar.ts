// The status bar's items

export interface StatusBarItemOptions {
  id: string;
  // may hold $(icon) names
  text: string;
  alignment: "left" | "right";
  priority?: number;
  tooltip?: string;
  command?: string;
}

export interface StatusBarItem extends StatusBarItemOptions {
  visible: boolean;
  hide(): void;
  show(): void;
}

export class StatusBar {
  add(options: StatusBarItemOptions): StatusBarItem {
    throw new Error("not implemented");
  }

  // visible items in display order: a higher priority sits further left,
  // equal priorities in insertion order
  left(): StatusBarItem[] {
    throw new Error("not implemented");
  }

  right(): StatusBarItem[] {
    throw new Error("not implemented");
  }
}

// "$(error) 2" -> [{ icon: "error" }, { text: " 2" }]
export function parseIcons(text: string): ({ icon: string } | { text: string })[] {
  throw new Error("not implemented");
}
