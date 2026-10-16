// CSS timing functions: time progress (0-1) to value progress (0-1)

export type EasingFunction = (t: number) => number;

// linear, ease, ease-in, ease-out, ease-in-out, cubic-bezier(x1, y1, x2,
// y2), steps(n), steps(n, start); throws for anything else, naming it
export function easing(name: string): EasingFunction {
  throw new Error("not implemented");
}
