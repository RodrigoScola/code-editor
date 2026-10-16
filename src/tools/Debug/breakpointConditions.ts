// the message with each {expression} replaced by its value; \{ is a
// literal brace, and an expression that throws shows its error
export function formatLogMessage(
  template: string,
  evaluate: (expression: string) => Promise<string>,
): Promise<string> {
  throw new Error("not implemented");
}

// ">5", ">=5", "==5", "5" (same as ==), "%3" (every third hit)
export function shouldBreakOnHit(condition: string, hitCount: number): boolean {
  throw new Error("not implemented");
}
