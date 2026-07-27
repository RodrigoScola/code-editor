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

export function assert(truthy: boolean, message: string) {
  run(truthy, message);
}

assert.ok = run;
assert.isFalse = isFalse;
