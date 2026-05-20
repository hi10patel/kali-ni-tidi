import { useEffect, useState } from 'react';
import Card, { CardBack, cardId } from './Card.jsx';
import PlayerAvatar from './PlayerAvatar.jsx';
import TeamProgress from './TeamProgress.jsx';
import { playerColor } from '../colors.js';

export default function TrickPlay({ game, playerId, action }) {
  const yourTurn = game.activePlayerId === playerId;
  const isBidder = game.highestBidderId === playerId;
  const trump = game.trumpSuit;
  const bidder = game.players.find(p => p.id === game.highestBidderId);
  const order = orderForView(game.players, playerId);

  const ledSuit = game.currentTrick.length > 0 ? game.currentTrick[0].card.suit : null;
  const canFollow = ledSuit && game.yourHand.some(c => c.suit === ledSuit);

  const [revealBanner, setRevealBanner] = useState(null);
  useEffect(() => {
    if (game.revealedPartners.length > 0) {
      const newest = game.revealedPartners[game.revealedPartners.length - 1];
      const p = game.players.find(p => p.id === newest);
      if (p) {
        setRevealBanner(`${p.name} is the partner!`);
        const t = setTimeout(() => setRevealBanner(null), 2600);
        return () => clearTimeout(t);
      }
    }
  }, [game.revealedPartners.length]);

  function canPlay(card) {
    if (!yourTurn) return false;
    if (!ledSuit) return true;
    if (canFollow) return card.suit === ledSuit;
    return true;
  }

  async function play(card) {
    await action('play_card', { cardId: cardId(card) });
  }

  const partnerCardSet = new Set(isBidder ? game.partnerCards : []);

  // Build the public bidding team list (bidder + revealed partners only).
  const biddingTeamIds = new Set([game.highestBidderId, ...game.revealedPartners]);

  return (
    <div className="phase play-v2">
      <div className="play-topbar">
        <div className="trump-pill">
          <span className="muted-tiny">Trump</span>
          <span className={`trump-glyph ${isRed(trump) ? 'red' : 'black'}`}>{suitGlyph(trump)}</span>
        </div>
        <BidderPill bidder={bidder} bid={game.highestBid} players={game.players} />
        <div className="trick-counter">
          <span className="muted-tiny">Trick</span>
          <strong>{game.tricksPlayed + 1}</strong>
        </div>
      </div>

      <TeamProgress game={game} />

      {/* Opponents row — avatars with their points, blink when it's their turn */}
      <div className="opp-row">
        {order.others.map(p => {
          const isActive = p.id === game.activePlayerId;
          const playedThisTrick = game.currentTrick.find(t => t.playerId === p.id);
          const inTeam = biddingTeamIds.has(p.id);
          return (
            <div
              key={p.id}
              className={`opp-tile ${isActive ? 'is-active' : ''} ${inTeam ? 'is-team' : ''}`}
              style={{ '--pc': playerColor(p.id, game.players) }}
            >
              <PlayerAvatar
                player={p}
                players={game.players}
                size="md"
                active={isActive}
                badge={p.id === game.highestBidderId ? '♛' : (p.revealedPartner ? '★' : null)}
                points={p.points || 0}
              />
              <div className="opp-cards-mini">
                {Array.from({ length: Math.min(p.handCount, 6) }).map((_, i) => (
                  <CardBack key={i} size="xs" />
                ))}
                {p.handCount > 6 && <span className="opp-count-mini">+{p.handCount - 6}</span>}
              </div>
              {playedThisTrick && (
                <div className="opp-played-v2">
                  <Card card={playedThisTrick.card} size="sm" trumpSuit={trump} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center: the trick table */}
      <div className="table-v2">
        {game.currentTrick.length === 0 ? (
          <div className="table-empty muted">
            {game.activePlayerId === playerId
              ? 'Lead a card to start the trick'
              : `${playerName(game, game.activePlayerId) || 'Someone'} will lead`}
          </div>
        ) : (
          <div className="table-cards">
            {game.currentTrick.map((t, i) => (
              <div key={i} className="table-card" style={{ '--pc': playerColor(t.playerId, game.players) }}>
                <Card card={t.card} size="md" trumpSuit={trump} />
                <div className="table-card-name">{playerName(game, t.playerId)}</div>
              </div>
            ))}
          </div>
        )}
        {game.lastTrick && game.currentTrick.length === 0 && (
          <div className="last-trick-v2">
            Last trick — <strong style={{ color: playerColor(game.lastTrick.winnerId, game.players) }}>
              {playerName(game, game.lastTrick.winnerId)}
            </strong> +{game.lastTrick.points} pt
          </div>
        )}
      </div>

      {revealBanner && <div className="reveal-banner">{revealBanner}</div>}

      {/* Your area */}
      <div
        className={`me-area ${yourTurn ? 'me-turn' : ''}`}
        style={{ '--pc': playerColor(playerId, game.players) }}
      >
        <div className="me-head">
          <PlayerAvatar
            player={order.me}
            players={game.players}
            size="sm"
            active={yourTurn}
            isMe={true}
            points={order.me.points || 0}
            badge={order.me.id === game.highestBidderId ? '♛' : (order.me.revealedPartner ? '★' : null)}
          />
          {ledSuit && (
            <div className="follow-hint">
              {canFollow
                ? <>follow <span className={`g ${isRed(ledSuit) ? 'r' : 'b'}`}>{suitGlyph(ledSuit)}</span></>
                : 'play any card'}
            </div>
          )}
        </div>
        <div className="me-hand">
          {game.yourHand.map((c, i) => {
            const playable = canPlay(c);
            const isPartner = partnerCardSet.has(cardId(c));
            return (
              <Card
                key={i}
                card={c}
                size="md"
                trumpSuit={trump}
                onClick={playable ? () => play(c) : undefined}
                disabled={!playable}
                dim={!playable || isPartner}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BidderPill({ bidder, bid, players }) {
  if (!bidder) return null;
  const color = playerColor(bidder.id, players);
  const initial = (bidder.name || '?').charAt(0).toUpperCase();
  return (
    <div className="bidder-pill" style={{ '--pc': color }}>
      <span className="bidder-disc">{initial}</span>
      <span className="bidder-meta">
        <span className="muted-tiny">Bid</span>
        <strong>{bid}</strong>
      </span>
    </div>
  );
}

function orderForView(players, myId) {
  const idx = players.findIndex(p => p.id === myId);
  const me = players[idx];
  const others = [];
  for (let i = 1; i < players.length; i++) {
    others.push(players[(idx + i) % players.length]);
  }
  return { me, others };
}

function playerName(game, id) {
  const p = game.players.find(p => p.id === id);
  return p ? p.name : '';
}

function suitGlyph(s) {
  return { S: '♠', H: '♥', D: '♦', C: '♣' }[s] || '?';
}

function isRed(s) {
  return s === 'H' || s === 'D';
}
