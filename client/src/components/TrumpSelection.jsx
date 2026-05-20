import Card from './Card.jsx';

const SUITS = [
  { code: 'S', label: 'Spades', glyph: '♠', red: false },
  { code: 'H', label: 'Hearts', glyph: '♥', red: true },
  { code: 'D', label: 'Diamonds', glyph: '♦', red: true },
  { code: 'C', label: 'Clubs', glyph: '♣', red: false },
];

export default function TrumpSelection({ game, playerId, action }) {
  const isBidder = game.highestBidderId === playerId;
  const bidderName = (game.players.find(p => p.id === game.highestBidderId) || {}).name || '';

  async function pick(suit) {
    await action('select_trump', { suit });
  }

  return (
    <div className="phase trump">
      <div className="phase-header">
        <h2>Trump selection</h2>
        <div className="muted">
          {bidderName} won the bid at <strong>{game.highestBid}</strong>
        </div>
      </div>

      {isBidder ? (
        <div className="card-panel">
          <p>Choose the trump suit:</p>
          <div className="suit-grid">
            {SUITS.map(s => (
              <button
                key={s.code}
                type="button"
                className={`suit-btn ${s.red ? 'red' : 'black'}`}
                onClick={() => pick(s.code)}
              >
                <div className="suit-glyph">{s.glyph}</div>
                <div className="suit-label">{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted center-text">Waiting for {bidderName} to pick the trump suit…</p>
      )}

      <div className="hand-row">
        <div className="hand-label">Your hand</div>
        <div className="hand-scroll">
          {game.yourHand.map((c, i) => <Card key={i} card={c} size="sm" />)}
        </div>
      </div>
    </div>
  );
}
