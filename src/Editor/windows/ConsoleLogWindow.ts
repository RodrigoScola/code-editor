import { LogEntry, LogLevel } from "../../logging/log.js";
import colors from "../../ui/colors.js";
import {
  UiComponent,
  UiPanel,
  UIScreen,
} from "../../ui/components/UiComponent.js";
import { EditorContext } from "../Editor/Editor.js";

export class TreeViewWindow extends UIScreen {
  constructor() {
    super();

    this.setText(EditorContext.instance?.rootWindow.view().logChildren());
  }
  onPrePaint(): void {
    this.cursor().width = this.view().contentLayout().width;
    this.cursor().height = this.view().contentLayout().height;
    this.cursor().column = 0;

    if (EditorContext.instance?.rootWindow.view().dirty()) {
      this.setText(EditorContext.instance?.rootWindow.view().logChildren());
    }
  }
  onEnter(ctx: EditorContext): void {}
}

export class ConsoleLogWindow extends UiPanel {
  logOutput: UIScreen = new UIScreen();
  componentTree: UIScreen = new TreeViewWindow();
  constructor() {
    super();

    const log = new UiComponent();
    log.view().setDirection("vertical");
    const outputLogTitle = new UiComponent().setText("log outputs");
    outputLogTitle.view().setHeight(1);
    log.addChildren(outputLogTitle).addChildren(this.logOutput);

    const tree = new UiComponent();
    const treeTitle = new UiComponent().setText("window  root");
    treeTitle.view().setHeight(1);
    tree.addChildren(treeTitle).addChildren(this.componentTree);

    this.addChildren(tree).addChildren(log);
  }

  defaultFocus(): UiComponent | null {
    return this.componentTree.defaultFocus();
  }

  getLevelColor(level: LogLevel) {
    switch (level) {
      case "debug":
      case "log":
        return colors.YELLOW_FOREGROUND;
      case "info":
        return colors.BLUE_FOREGROUND;
      case "error":
        return colors.RED_BACKGROUND;
      case "warn":
        return colors.ORANGE_FOREGROUND;

      default:
        throw new Error("invalid color on log level: " + level);
    }
  }

  // arrow property so `this` stays bound when passed as a callback
  // (logger.subscribe(window.attachListener) calls it without the window)
  attachListener = (entry: LogEntry) => {
    if (this.logOutput.buffer().count() > 100) {
      this.logOutput.buffer().removeLine(0);
    }

    this.logOutput
      .buffer()
      .addLine(
        `${this.getLevelColor(entry.level)} ${entry.message} ${colors.FOREGROUND_OFF}`,
      );
    this.logOutput.cursor().moveDown();
  };
}
