// Gradient math, before anything is painted

export interface GradientStop {
  // formatColor()ed: "#rrggbb[aa]"
  color: string;
  // 0-1
  position: number;
}

export interface Gradient {
  type: "linear" | "radial";
  // degrees, CSS's: 0 up, 90 right, 180 down (the default); 0 for radial
  angle: number;
  stops: GradientStop[];
}

// linear-gradient(...) / radial-gradient(...), or null
export function parseGradient(css: string): Gradient | null {
  throw new Error("not implemented");
}

// the color at t (0-1) along the gradient line
export function gradientColorAt(gradient: Gradient, t: number): string {
  throw new Error("not implemented");
}

// the color of every cell, [row][column], at the cell's center
export function sampleGradient(gradient: Gradient, width: number, height: number): string[][] {
  throw new Error("not implemented");
}
