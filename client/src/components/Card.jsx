import { useState } from 'react';

const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };

export function isRed(suit) {
  return suit === 'H' || suit === 'D';
}

export function cardId(card) {
  return `${card.rank}${card.suit}`;
}

export function suitName(s) {
  return { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' }[s] || s;
}

// deckofcardsapi.com uses "0" for ten and the same suit letters we use.
function cardImageUrl(card) {
  const rank = card.rank === '10' ? '0' : card.rank;
  return `https://deckofcardsapi.com/static/img/${rank}${card.suit}.png`;
}

export default function Card({ card, trumpSuit, onClick, disabled, dim, selected, size = 'md' }) {
  if (!card) return null;
  const is3S = card.rank === '3' && card.suit === 'S';
  const isTrump = trumpSuit && card.suit === trumpSuit;
  const [imgFailed, setImgFailed] = useState(false);

  const usingImage = !imgFailed;

  const classes = [
    'card',
    `card-${size}`,
    isRed(card.suit) ? 'red' : 'black',
    is3S && 'tidi',
    isTrump && 'trump',
    disabled && 'disabled',
    dim && 'dim',
    selected && 'selected',
    onClick && !disabled && 'clickable',
    usingImage && 'card-img-mode',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={`${card.rank} of ${suitName(card.suit)}`}
    >
      {usingImage ? (
        <img
          src={cardImageUrl(card)}
          alt=""
          className="card-img"
          onError={() => setImgFailed(true)}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <>
          <div className="card-corner top">
            <div className="rank">{card.rank}</div>
            <div className="suit">{SUIT_GLYPH[card.suit]}</div>
          </div>
          <div className="card-center">{SUIT_GLYPH[card.suit]}</div>
          <div className="card-corner bottom">
            <div className="rank">{card.rank}</div>
            <div className="suit">{SUIT_GLYPH[card.suit]}</div>
          </div>
        </>
      )}
    </button>
  );
}

export function CardBack({ size = 'md' }) {
  return <div className={`card card-back card-${size}`}><div className="card-back-pattern" /></div>;
}
