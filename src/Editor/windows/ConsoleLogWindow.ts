import { LogEntry, LogLevel } from "../../logging/log.js";
import colors from "../../ui/colors/colors.js";
import { UIScreen } from "../../ui/components/UiScreen/UIScreen.js";
import { UiComponent, UiPanel } from "../../ui/components/UiComponent.js";
import { EditorContext } from "../EditorContext.js";

export class TreeViewWindow extends UIScreen {
  constructor() {
    super();

    this.setText(EditorContext.instance?.rootWindow.view().logChildren());
  }
  onPrePaint(): void {
    // the whole content, in characters and lines (the cursor's size is cells)
    const cl = this.view().contentLayout();
    // rounded down, so it doesn't stick out past the edges
    this.cursor().width = Math.floor(cl.width / this.view().charWidth());
    this.cursor().height = Math.floor(cl.height / this.view().lineHeight());
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
        return colors.YELLOW;
      case "info":
        return colors.BLUE;
      case "error":
        return colors.RED;
      case "warn":
        return colors.ORANGE;

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
      .append(
        `${this.getLevelColor(entry.level)} ${entry.message} ${colors.FOREGROUND_OFF}`,
      );
    this.logOutput.cursor().moveDown();
  };
}
