import { assert } from "vitest";
import { LogEntry, LogLevel } from "../../logging/log.js";
import colors from "../../ui/colors.js";
import { ComponentBorder } from "../../ui/display/border.js";
import {
  UiComponent,
  UiPanel,
  UIScreen,
} from "../../ui/components/UiComponent.js";
import { EditorContext } from "../Editor/Editor.js";
import { ComponentStyle } from "../../ui/ComponentStyles.js";

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
  onEnter(ctx: EditorContext): void {
    const hoveringLine: BufferLike = this.view().content();
    const line = hoveringLine.at(this.cursor().line);
    if (!line) {
      console.error(`invalid line to get at: ${this.cursor().line}`);
      return;
    }
    const hasId = line.includes("id");
    if (!hasId) {
      console.error(`component doesnt have identification `);
      return;
    }

    if (hasId) {

      EditorContext.instance?.rootWindow.findChildrenById(id)


      const child = EditorContext.instance?.findComponentById(nm);
      if (child) {
        // border() returns the live object, so editing it in place would also
        // change `previous`. swap in a separate one and put the original back
        const previous = child.view().styles();

        child
          .view()
          .setStyles(
            ComponentStyle.Blend(
              ComponentStyle.Create().setBackgroundColor(
                colors.BLACK_BACKGROUND,
              ),
              child.view().styles(),
            ),
          );

        setTimeout(() => {
          child.view().setStyles(previous);
        }, 1000);
      }

      console.log(
        `start at: ${startAt}, ends at  ${endAt}, rest:${rest}, child?: ${Boolean(child)}`,
      );
    }

    // EditorContext.instance?.windowManager.activate(window)
  }
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
