import { LogEntry, LogLevel } from "../../logging/log.js";
import colors from "../../ui/colors.js";
import { UiComponent, UIScreen } from "../../ui/components/UiComponent.js";
import { EditorContext } from "../Editor/Editor.js";

export class ConsoleLogWindow extends UIScreen {
  logOutput: UIScreen = new UIScreen();
  componentTree: UIScreen = new UIScreen();
  constructor() {
    super();
    this.setCursorEnabled(false);

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

    this.componentTree.setText(
      EditorContext.instance?.rootWindow.view().logChildren(),
    );
  }

  onPrePaint(): void {
    if (EditorContext.instance?.rootWindow.view().dirty()) {
      this.componentTree.setText(
        EditorContext.instance?.rootWindow.view().logChildren(),
      );
    }
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
