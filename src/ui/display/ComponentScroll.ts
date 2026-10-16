import { DisplayComponent } from "./displayComponent.js";
import { ScrollBar, ScrollBarStyle } from "../components/Scrollbar.js";

type CachedBars = {
  vertical: ScrollBar | null;
  horizontal: ScrollBar | null;
};

export class ComponentScroll {
  private _verticalScrollBar = new ScrollBar();
  private _horizontalScrollBar = new ScrollBar();
  private _scrollBarEnabled: boolean = true;
  private _scrollTop: number = 0;
  private _scrollLeft: number = 0;

  private _cachedBars = {
    vertical: null,
    horizontal: null,
  } as CachedBars;

  private parent: DisplayComponent;
  constructor(pr: DisplayComponent) {
    this.parent = pr;
  }

  cache(): CachedBars {
    return this._cachedBars;
  }

  arrange() {
    const parent = this.parent;
    let paddingHeight = parent.paddingLayout().height;
    let paddingWidth = parent.paddingLayout().width;

    if (this.horizontalScrollbar()) {
      paddingHeight -= this.horizontalScrollbar()!.height();
    }
    if (this.verticalScrollbar()) {
      paddingWidth -= this.verticalScrollbar()!.width();
    }

    const verticalDimensions = ScrollBar.Thumb(
      paddingHeight,
      parent.visibleHeight(),
      this.scrollHeight(),
      this.scrollTop(),
    );

    this.verticalScrollbar()
      ?.setSize(verticalDimensions.size)
      .setOffset(verticalDimensions.offset);

    const horizontalDimensions = ScrollBar.Thumb(
      paddingWidth,
      parent.visibleWidth(),
      this.scrollWidth(),
      this.scrollLeft(),
    );
    this.horizontalScrollbar()
      ?.setSize(horizontalDimensions.size)
      .setOffset(horizontalDimensions.offset);
  }

  scrollIntoView(component: DisplayComponent) {
    const child = this.parent.findChildrenById(component.getId());
    if (!child) {
      console.error(`children not found `);
      return this;
    }

    const childTop =
      child.layout().y - this.parent.contentLayout().y + this.scrollTop();

    const childBottom = child.layout().height + childTop;

    const windowTop = this.scrollTop();
    const windowBottom = windowTop + this.parent.visibleHeight();

    if (childTop < windowTop) {
      this.setScrollTop(childTop);
    } else if (childBottom > windowBottom) {
      this.setScrollTop(childBottom - windowBottom);
    }
    return this;
  }

  setScrollbarStyle(style: Partial<ScrollBarStyle>) {
    this._verticalScrollBar.setStyle(style);

    this._horizontalScrollBar.setStyle(style);
    return this;
  }

  verticalScrollbar(): ScrollBar | null {
    if (this._cachedBars.vertical) {
      return this._cachedBars.vertical;
    }

    if (
      !this._scrollBarEnabled ||
      this.parent.overflow() == "visible" ||
      this.parent.overflow() === "hidden"
    ) {
      return null;
    }

    const totalHeight = this.scrollHeight();

    if (totalHeight > this.parent.visibleHeight()) {
      this._cachedBars.vertical = this._verticalScrollBar;
      return this._cachedBars.vertical;
    }

    this._cachedBars.vertical = null;
    return this._cachedBars.vertical;
  }
  horizontalScrollbar(): ScrollBar | null {
    if (this._cachedBars.horizontal) {
      return this._cachedBars.horizontal;
    }
    this._cachedBars.horizontal = null;

    if (
      this.parent.overflow() == "visible" ||
      this.parent.overflow() === "hidden"
    ) {
      return this._cachedBars.horizontal;
    }

    const totalWidth = this.scrollWidth();

    if (totalWidth > this.parent.visibleWidth()) {
      this._cachedBars.horizontal = this._horizontalScrollBar;
    }
    return this._cachedBars.horizontal;
  }

  reset() {
    this._cachedBars.horizontal = null;
    this._cachedBars.vertical = null;
  }

  scrollTop() {
    const max = Math.max(0, this.scrollHeight() - this.parent.visibleHeight());
    return Math.min(Math.max(this._scrollTop, 0), max);
  }
  setScrollTop(amount: number) {
    this._scrollTop = amount;
    return this;
  }
  scrollLeft() {
    const max = Math.max(0, this.scrollWidth() - this.parent.visibleWidth());
    return Math.min(Math.max(this._scrollLeft, 0), max);
  }

  setScrollLeft(amount: number) {
    this._scrollLeft = amount;
    return this;
  }

  setScrollBar(enabled: boolean) {
    this._scrollBarEnabled = enabled;
    this.reset();
    return this;
  }
  scrollWidth() {
    const parent = this.parent;
    let width = parent.padding().left + parent.padding().right;
    let childrenWidth = 0;
    let maxWidth = 0;

    for (const child of parent.normalChildren()) {
      const childWidth =
        child.measuredSize().width + child.margin().left + child.margin().right;

      maxWidth = Math.max(childWidth, maxWidth);
      childrenWidth += childWidth;
    }

    if (parent.direction() === "vertical") {
      width += maxWidth;
    } else {
      width += childrenWidth;
    }

    return width;
  }
  scrollHeight() {
    const parent = this.parent;
    let height = parent.padding().top + parent.padding().bottom;
    let childrenHeight = 0;
    let maxHeight = 0;

    // measured sizes, not layouts: arrange asks for this before it has
    // placed the children
    for (const child of parent.normalChildren()) {
      const childHeight =
        child.measuredSize().height +
        child.margin().top +
        child.margin().bottom;

      maxHeight = Math.max(maxHeight, childHeight);
      childrenHeight += childHeight;
    }

    if (parent.direction() === "vertical") {
      height += childrenHeight;
    } else {
      height += maxHeight;
    }

    return height;
  }
}
