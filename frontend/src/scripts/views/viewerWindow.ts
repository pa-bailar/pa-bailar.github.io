// Which of the event viewer's slides have their detail inside (eventDialog.ts): the current event and `around`
// on each side, so a swipe always lands on a rendered event while the rest of the list costs no memory.

export function slidesToRender(position: number, count: number, around: number): Set<number> {
  const keep = new Set<number>();
  if (count <= 0) return keep;
  const center = Math.min(Math.max(position, 0), count - 1);
  for (let i = Math.max(center - around, 0); i <= Math.min(center + around, count - 1); i++) keep.add(i);
  return keep;
}
