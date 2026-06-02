// Vías habilitadas en el peaje: 1..40 y 43,44,46,47,50,51
export const LANES: number[] = [
  ...Array.from({ length: 40 }, (_, i) => i + 1),
  43, 44, 46, 47, 50, 51,
];

export const isValidLane = (lane: number) => LANES.includes(lane);

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
