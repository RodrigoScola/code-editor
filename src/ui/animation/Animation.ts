// Keyframe animations, like the browser's element.animate()

// offsets spread evenly unless a keyframe has one (0-1)
export interface Keyframe {
  offset?: number;
  backgroundColor?: string;
  color?: string;
  opacity?: number;
  backgroundImage?: string;
}

export interface AnimationOptions {
  // ms
  duration: number;
  delay?: number;
  // or Infinity
  iterations?: number;
  direction?: "normal" | "reverse" | "alternate";
  // a CSS timing function, see easing.ts
  easing?: string;
  // "forwards" keeps the last keyframe when it finishes
  fill?: "none" | "forwards";
}

export type AnimationPlayState = "running" | "paused" | "finished" | "idle";

export class Animation {
  // throws for fewer than two keyframes or an unknown property
  constructor(keyframes: Keyframe[], options: AnimationOptions) {}

  get playState(): AnimationPlayState {
    throw new Error("not implemented");
  }

  // ms since it started, delay included
  get currentTime(): number {
    throw new Error("not implemented");
  }

  play(): void {
    throw new Error("not implemented");
  }

  pause(): void {
    throw new Error("not implemented");
  }

  // stops it and takes its effect away
  cancel(): void {
    throw new Error("not implemented");
  }

  // jumps to the end
  finish(): void {
    throw new Error("not implemented");
  }
}
