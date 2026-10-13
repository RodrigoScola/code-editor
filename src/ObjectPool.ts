import { assert } from "./assert.js";

export class ObjectPool<T> {
  private pool: T[] = [];
  private create: () => T;
  constructor(createFn: () => T) {
    this.create = createFn;
  }

  retrieve(obj: T) {
    this.pool.push(obj);
  }
  get(): T {
    if (this.pool.length == 0) {
      return this.create();
    }
    const out = this.pool.pop();
    assert(out, `could not get  object out of pool`);

    return out;
  }

  count() {
    return this.pool.length;
  }
}
