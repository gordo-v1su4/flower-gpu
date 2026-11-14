const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/** The head grows at its attachment before unfolding; closing reverses the same path. */
export function bloomState(progress: number, closedScale = 0.5) {
  const p = Math.max(0, Math.min(1, progress));
  return {
    open: smooth((p - 0.22) / 0.78),
    scale: closedScale + (1 - closedScale) * smooth(p / 0.22),
  };
}
