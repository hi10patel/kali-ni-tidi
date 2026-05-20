import Card from './Card.jsx';
import PlayerAvatar from './PlayerAvatar.jsx';
import { playerColor, OPP_COLOR } from '../colors.js';

export default function ScoreScreen({ game, isOwner, onPlayAgain }) {
  const r = game.finalResult;
  if (!r) return null;
  const bidder = game.players.find(p => p.id === r.bidderId);
  const winningTeam = r.success ? 'bidding' : 'opposing';

  const biddingPlayers = r.perPlayer.filter(p => p.team === 'bidding');
  const opposingPlayers = r.perPlayer.filter(p => p.team === 'opposing');

  return (
    <div className="phase score-v2">
      <div className={`result-hero ${r.success ? 'win' : 'lose'}`}>
        <div className="hero-icon">{r.success ? '🏆' : '🛡️'}</div>
        <h2>{r.success ? 'Bidding team wins!' : 'Opposition wins!'}</h2>
        <p className="hero-sub">
          {bidder ? bidder.name : 'Bidder'} bid <strong>{r.bid}</strong>,
          {' '}made <strong>{r.biddingPoints}</strong>
          {r.success ? <> · target hit</> : <> · short by <strong>{r.bid - r.biddingPoints}</strong></>}
        </p>
      </div>

      <div className="score-meta">
        <div className="sm-cell">
          <span className="muted-tiny">Trump</span>
          <div className={`sm-big trump-glyph ${isRed(r.trump) ? 'red' : 'black'}`}>{suitGlyph(r.trump)}</div>
        </div>
        <div className="sm-cell">
          <span className="muted-tiny">Bid</span>
          <div className="sm-big">{r.bid}</div>
        </div>
        <div className="sm-cell">
          <span className="muted-tiny">Bidding made</span>
          <div className="sm-big">{r.biddingPoints}</div>
        </div>
        <div className="sm-cell">
          <span className="muted-tiny">Opposition</span>
          <div className="sm-big">{r.opposingPoints}</div>
        </div>
      </div>

      <TeamPanel
        title="Bidding team"
        players={biddingPlayers}
        gamePlayers={game.players}
        bidderId={r.bidderId}
        partnerIds={r.partnerIds}
        isWinner={winningTeam === 'bidding'}
        accentColor={bidder ? playerColor(bidder.id, game.players) : '#888'}
      />

      {r.partnerCards.length > 0 && (
        <div className="partner-reveal">
          <div className="muted-tiny">Partner card{r.partnerCards.length > 1 ? 's' : ''} declared</div>
          <div className="partner-reveal-cards">
            {r.partnerCards.map(cid => {
              const card = { rank: cid.slice(0, -1), suit: cid.slice(-1) };
              const holder = r.partnerIds
                .map(id => game.players.find(p => p.id === id))
                .find(p => p) ; // best-effort, multi-card: any partner
              return (
                <div key={cid} className="partner-reveal-item">
                  <Card card={card} size="sm" trumpSuit={r.trump} />
                </div>
              );
            })}
          </div>
          <div className="partner-holders">
            {r.partnerIds.length === 0
              ? <span className="muted">(no one held the partner card)</span>
              : r.partnerIds.map(id => {
                  const p = game.players.find(p => p.id === id);
                  if (!p) return null;
                  return (
                    <span key={id} className="partner-holder-chip" style={{ '--pc': playerColor(id, game.players) }}>
                      held by <strong>{p.name}</strong>
                    </span>
                  );
                })}
          </div>
        </div>
      )}

      <TeamPanel
        title="Opposition"
        players={opposingPlayers}
        gamePlayers={game.players}
        bidderId={r.bidderId}
        partnerIds={r.partnerIds}
        isWinner={winningTeam === 'opposing'}
        accentColor={OPP_COLOR}
      />

      {isOwner ? (
        <button className="btn primary big" onClick={onPlayAgain}>Play again</button>
      ) : (
        <p className="muted center-text">Waiting for host to start the next round…</p>
      )}
    </div>
  );
}

function TeamPanel({ title, players, gamePlayers, bidderId, partnerIds, isWinner, accentColor }) {
  if (players.length === 0) return null;
  const partnerSet = new Set(partnerIds);
  return (
    <div className={`team-panel ${isWinner ? 'is-winner' : 'is-loser'}`} style={{ '--accent': accentColor }}>
      <div className="team-panel-head">
        <span className="team-title">{title}</span>
        <span className="team-status">
          {isWinner ? <>👑 Winner</> : <>💔 Lost</>}
        </span>
      </div>
      <ul className="team-roster">
        {players.map(p => {
          const isBidder = p.id === bidderId;
          const isPartner = partnerSet.has(p.id);
          const role = isBidder ? 'bidder' : (isPartner ? 'partner' : 'opponent');
          return (
            <li key={p.id} className="team-roster-row">
              <PlayerAvatar
                player={{ id: p.id, name: p.name }}
                players={gamePlayers}
                size="sm"
                badge={isWinner ? '👑' : null}
              />
              <span className="team-role">{role}</span>
              <span className="team-points">{p.points} pt</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function suitGlyph(s) {
  return { S: '♠', H: '♥', D: '♦', C: '♣' }[s] || '?';
}
function isRed(s) {
  return s === 'H' || s === 'D';
}
