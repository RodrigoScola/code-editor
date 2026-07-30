function run(truthy: boolean, message: string) {
  if (!truthy) {
    throw new Error(message);
  }
}

function isFalse(truthy: boolean, message: string) {
  if (truthy == true) {
    throw new Error(message);
  }
}

export function assert(truthy: any, message: string): asserts truthy is true {
  run(truthy, message);
}

assert.ok = run;
assert.isFalse = isFalse;
