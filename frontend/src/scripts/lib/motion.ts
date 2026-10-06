// The motion tokens scripts need, mirroring tokens.css (--duration-*, --ease-*): the details drawer sets its
// transition from here, and waits for the side panel to slide out. tests/motion.test.ts checks they agree.

/** Durations, in ms. */
export const DURATION = {
  /** A bottom sheet rising, the details drawer rising to half height (--duration-enter). */
  enter: 320,
  /** A sheet or the drawer settling: between heights, springing back after a drag (--duration-settle). */
  settle: 300,
  /** The side panel sliding in (--duration-panel-in); the page gliding aside for it (lib/glide.ts). */
  panelIn: 280,
  /** The side panel sliding out (--duration-panel-out). */
  panelOut: 200,
} as const;

/** Material 3's curves. */
export const EASE = {
  /** Settling, springing back (--ease-standard). */
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  /** Coming in: quick, with a soft landing (--ease-emphasized-decelerate). */
  emphasizedDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  /** Leaving: it goes and keeps going (--ease-emphasized-accelerate). */
  emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
} as const;
