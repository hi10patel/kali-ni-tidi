// Shown above every game phase. Tells every player whose turn it is right now
// and — when the order is deterministic — who's up next.

export default function TurnIndicator({ game, playerId }) {
  const activeId = game.activePlayerId;
  if (!activeId) return null;
  const players = game.players;
  const active = players.find(p => p.id === activeId);
  if (!active) return null;
  const isMe = activeId === playerId;

  // Phase-friendly label for what the active player is doing.
  const actionLabel = {
    bidding: 'to bid',
    trump: 'to pick trump',
    partner: 'to name partner card' + ((game.partnerCount || 0) > 1 ? 's' : ''),
    playing: 'to play',
  }[game.state] || '';

  // Compute the next player when it's predictable.
  // - playing: seat-order successor of the active player (everyone plays each trick)
  // - bidding: next active bidder who isn't the current top bidder
  // - trump / partner: only the bidder acts, so there is no "next"
  let nextPlayer = null;
  const activeIdx = players.findIndex(p => p.id === activeId);
  if (game.state === 'playing') {
    // Next is meaningful only while there are still seats left in the current trick.
    const trickInProgress = (game.currentTrick || []).length;
    if (trickInProgress < players.length - 1) {
      nextPlayer = players[(activeIdx + 1) % players.length];
    }
  } else if (game.state === 'bidding') {
    const activeSet = new Set(game.activeBidderIds || players.map(p => p.id));
    for (let i = 1; i <= players.length; i++) {
      const idx = (activeIdx + i) % players.length;
      const cand = players[idx];
      if (activeSet.has(cand.id) && cand.id !== game.highestBidderId) {
        nextPlayer = cand;
        break;
      }
    }
  }

  const meIfMe = (p) => (p.id === playerId ? 'you' : p.name);

  return (
    <div className={`turn-indicator ${isMe ? 'me' : ''}`}>
      <span className="turn-dot" />
      <span className="turn-main">
        <strong>{isMe ? 'Your turn' : `${active.name}'s turn`}</strong>
        {actionLabel && <span className="turn-action"> {actionLabel}</span>}
      </span>
      {nextPlayer && (
        <span className="turn-next">
          next <strong>{meIfMe(nextPlayer)}</strong>
        </span>
      )}
    </div>
  );
}
