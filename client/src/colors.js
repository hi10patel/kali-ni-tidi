// Ludo-style player palette — bold, distinct, accessible.
// Assigned by seat order (index 0 = first player to join).
const PALETTE = [
  '#E63946', // 1 — red
  '#1D7AE0', // 2 — blue
  '#2A9D5E', // 3 — green
  '#F4A621', // 4 — amber
  '#8E44AD', // 5 — purple
  '#16A085', // 6 — teal
];

export function playerColor(playerId, players) {
  if (!players) return '#888';
  const idx = players.findIndex(p => p.id === playerId);
  if (idx < 0) return '#888';
  return PALETTE[idx % PALETTE.length];
}

export function playerColorByIndex(idx) {
  return PALETTE[idx % PALETTE.length];
}

// Opposing team color — used everywhere the non-bidding team needs to be visualized.
export const OPP_COLOR = '#1D7AE0';
