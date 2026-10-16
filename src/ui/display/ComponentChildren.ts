import { DisplayComponent } from "./displayComponent.js";

export class ComponentChildren {
  private childs: DisplayComponent[] = [];
  constructor(private component: DisplayComponent) {}
  children(): DisplayComponent[] {
    return this.childs;
  }
  addChildren(children: DisplayComponent | DisplayComponent[]) {
    if (Array.isArray(children)) {
      for (const child of children) {
        this.childs.push(child.setParent(this.component));
      }
    } else {
      this.childs.push(children.setParent(this.component));
    }

    return this;
  }

  addChildAt(child: DisplayComponent, index: number): this {
    this.childs.splice(index, 0, child.setParent(this.component));
    return this;
  }

  removeChild(child: DisplayComponent): this {
    this.childs = this.childs.filter((current) => current !== child);

    child.setParent(null);

    return this;
  }

  findChildrenById(id: number): DisplayComponent | null {
    if (this.component.getId() === id) {
      return this.component;
    }
    for (const child of this.children()) {
      const found = child.findChildrenById(id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  findChildrenByName(nm: string): DisplayComponent | null {
    if (this.component.name() === nm) {
      return this.component;
    }

    for (const child of this.children()) {
      const found = child.findChildrenByName(nm);

      if (found) {
        return found;
      }
    }

    return null;
  }
}
