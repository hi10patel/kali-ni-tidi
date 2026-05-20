import { useMemo, useState, useEffect } from 'react';
import Card from './Card.jsx';
import PlayerAvatar from './PlayerAvatar.jsx';
import { playerColor } from '../colors.js';

export default function Bidding({ game, playerId, action }) {
  const yourTurn = game.currentBidderId === playerId;
  const isOpeningBid = !game.highestBidderId;
  const youAreHighest = game.highestBidderId === playerId;
  const minBid = Math.max(150, game.highestBid + 5);
  const bidOptions = useMemo(() => {
    const out = [];
    for (let v = minBid; v <= 250; v += 5) out.push(v);
    return out;
  }, [minBid]);
  const [selected, setSelected] = useState(bidOptions[0] || 150);

  useEffect(() => {
    if (bidOptions.length > 0 && !bidOptions.includes(selected)) {
      setSelected(bidOptions[0]);
    }
  }, [bidOptions, selected]);

  const activeSet = new Set(game.activeBidderIds || game.players.map(p => p.id));

  async function placeBid() {
    await action('place_bid', { bidAmount: selected });
  }
  async function giveUp() {
    await action('pass_bid');
  }

  return (
    <div className="phase bidding-v2">
      <div className="phase-title">
        <h2>Auction</h2>
        <p className="muted">
          {game.highestBidderId
            ? <>Top bid <strong>{game.highestBid}</strong> by {playerName(game, game.highestBidderId)}</>
            : 'Opening bidder must place a bid (150-250).'}
        </p>
      </div>

      {/* Bidder list — color-coded avatars, blinking when active */}
      <div className="bid-roster">
        {game.players.map(p => {
          const b = game.bids[p.id];
          const isCurrent = game.currentBidderId === p.id;
          const isHighest = game.highestBidderId === p.id;
          const isActive = activeSet.has(p.id);
          const isMe = p.id === playerId;
          let subline;
          if (!isActive) subline = 'gave up';
          else if (isCurrent) subline = 'thinking…';
          else if (typeof b === 'number') subline = `bid ${b}`;
          else subline = 'waiting';

          return (
            <div
              key={p.id}
              className={[
                'bid-row',
                isCurrent && 'is-current',
                isHighest && 'is-highest',
                !isActive && 'is-out',
              ].filter(Boolean).join(' ')}
              style={{ '--pc': playerColor(p.id, game.players) }}
            >
              <PlayerAvatar
                player={p}
                players={game.players}
                size="md"
                active={isCurrent}
                isMe={isMe}
                badge={isHighest ? '♛' : null}
                subline={subline}
              />
              {isHighest && (
                <div className="bid-badge">{b}</div>
              )}
            </div>
          );
        })}
      </div>

      {yourTurn ? (
        <div className="card-panel bid-controls">
          {bidOptions.length > 0 ? (
            <p className="muted small">
              {isOpeningBid
                ? 'Open the auction — pick any bid from 150 to 250.'
                : <>Raise above <strong>{game.highestBid}</strong> or give up.</>}
            </p>
          ) : (
            <p className="muted small">No room left to raise. Give up or wait.</p>
          )}

          {bidOptions.length > 0 && (
            <div className="bid-grid">
              {bidOptions.map(v => (
                <button
                  key={v}
                  type="button"
                  className={`btn bid-chip ${selected === v ? 'active' : ''}`}
                  onClick={() => setSelected(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          <div className="actions">
            {bidOptions.length > 0 && (
              <button className="btn primary" onClick={placeBid}>
                {isOpeningBid ? `Bid ${selected}` : `Raise to ${selected}`}
              </button>
            )}
            {!isOpeningBid && !youAreHighest && (
              <button className="btn give-up-btn" onClick={giveUp}>I give up</button>
            )}
          </div>
        </div>
      ) : (
        <p className="muted center-text small">
          {youAreHighest
            ? <>You hold the top bid at <strong>{game.highestBid}</strong>. Waiting for challengers…</>
            : <>Waiting for {playerName(game, game.currentBidderId)}…</>}
        </p>
      )}

      <YourHand game={game} />
    </div>
  );
}

function playerName(game, id) {
  const p = game.players.find(p => p.id === id);
  return p ? p.name : '';
}

function YourHand({ game }) {
  return (
    <div className="hand-row">
      <div className="hand-label">Your hand · {game.yourHand.length} cards</div>
      <div className="hand-scroll">
        {game.yourHand.map((c, i) => (
          <Card key={i} card={c} size="sm" />
        ))}
      </div>
    </div>
  );
}
