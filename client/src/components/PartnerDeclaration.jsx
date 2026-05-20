import { useMemo, useState } from 'react';
import Card, { cardId } from './Card.jsx';

const SUIT_ORDER = ['S', 'H', 'D', 'C'];
const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export default function PartnerDeclaration({ game, playerId, action }) {
  const isBidder = game.highestBidderId === playerId;
  const bidderName = (game.players.find(p => p.id === game.highestBidderId) || {}).name || '';
  const expected = game.partnerCardsExpected || (game.playerCount >= 5 ? 2 : 1);
  const available = game.availablePartnerCards || [];
  const [selected, setSelected] = useState([]);

  const grouped = useMemo(() => {
    const buckets = { S: [], H: [], D: [], C: [] };
    for (const c of available) buckets[c.suit].push(c);
    for (const suit of SUIT_ORDER) {
      buckets[suit].sort((a, b) => RANK_ORDER.indexOf(b.rank) - RANK_ORDER.indexOf(a.rank));
    }
    return buckets;
  }, [available]);

  function toggle(c) {
    const id = cardId(c);
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= expected) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  async function confirm() {
    if (selected.length !== expected) return;
    await action('declare_partner', { cardIds: selected });
  }

  if (!isBidder) {
    return (
      <div className="phase partner">
        <div className="phase-header">
          <h2>Partner declaration</h2>
          <div className="muted">Trump: <strong>{suitGlyph(game.trumpSuit)}</strong></div>
        </div>
        <p className="muted center-text">{bidderName} is choosing partner card{expected > 1 ? 's' : ''}…</p>
        <div className="hand-row">
          <div className="hand-label">Your hand</div>
          <div className="hand-scroll">
            {game.yourHand.map((c, i) => <Card key={i} card={c} size="sm" trumpSuit={game.trumpSuit} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phase partner">
      <div className="phase-header">
        <h2>Pick {expected} partner card{expected > 1 ? 's' : ''}</h2>
        <div className="muted">Trump: <strong>{suitGlyph(game.trumpSuit)}</strong> · whoever holds the named card{expected > 1 ? 's' : ''} is your secret partner</div>
      </div>

      <div className="card-panel">
        {SUIT_ORDER.map(suit => {
          if (grouped[suit].length === 0) return null;
          return (
            <div key={suit} className="suit-row">
              <div className={`suit-row-label ${suit === 'H' || suit === 'D' ? 'red' : 'black'}`}>
                {suitGlyph(suit)}
              </div>
              <div className="suit-row-cards">
                {grouped[suit].map(c => {
                  const id = cardId(c);
                  return (
                    <Card
                      key={id}
                      card={c}
                      size="sm"
                      trumpSuit={game.trumpSuit}
                      selected={selected.includes(id)}
                      onClick={() => toggle(c)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="actions">
          <button
            className="btn primary"
            disabled={selected.length !== expected}
            onClick={confirm}
          >
            Confirm ({selected.length}/{expected})
          </button>
        </div>
      </div>

      <div className="hand-row">
        <div className="hand-label">Your hand · {game.yourHand.length}</div>
        <div className="hand-scroll">
          {game.yourHand.map((c, i) => <Card key={i} card={c} size="sm" trumpSuit={game.trumpSuit} />)}
        </div>
      </div>
    </div>
  );
}

function suitGlyph(s) {
  return { S: '♠', H: '♥', D: '♦', C: '♣' }[s] || '?';
}
