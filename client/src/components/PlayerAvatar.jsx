import { playerColor } from '../colors.js';

// A round, color-coded avatar with the player's first initial.
// `active` makes it pulse with the player's color (replaces the "X to play" text indicator).
export default function PlayerAvatar({
  player,
  players,
  size = 'md',
  active = false,
  isMe = false,
  badge = null,
  points,
  subline,
  compact = false,
}) {
  if (!player) return null;
  const color = playerColor(player.id, players);
  const initial = (player.name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={[
        'pa',
        `pa-${size}`,
        active && 'pa-active',
        isMe && 'pa-me',
        compact && 'pa-compact',
      ].filter(Boolean).join(' ')}
      style={{ '--pc': color }}
    >
      <div className="pa-disc-wrap">
        <div className="pa-disc">{initial}</div>
        {badge && <div className="pa-badge">{badge}</div>}
      </div>
      {!compact && (
        <div className="pa-meta">
          <div className="pa-name">{isMe ? `${player.name} (you)` : player.name}</div>
          {(subline || typeof points === 'number') && (
            <div className="pa-sub">
              {typeof points === 'number' && <span className="pa-points">{points} pt</span>}
              {subline && <span className="pa-subtext">{subline}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
