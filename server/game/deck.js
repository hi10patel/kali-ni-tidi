// Deck composition, card identity, and trick resolution for Kali ni Tidi.
// Cards are dealt evenly to all players:
//   3 players: remove 2♥ only          → 51 cards → 17 each
//   4 players: no removals             → 52 cards → 13 each
//   5 players: remove 2♥ and 2♦        → 50 cards → 10 each
//   6 players: remove all 2s           → 48 cards →  8 each
// 3 of Spades is ALWAYS kept (it is the supreme trump worth 30 points).

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function cardId(card) {
  return `${card.rank}${card.suit}`;
}

function cardFromId(id) {
  const suit = id.slice(-1);
  const rank = id.slice(0, -1);
  return { rank, suit };
}

function cardPoints(card) {
  if (isThreeOfSpades(card)) return 30;
  if (['A', 'K', 'Q', 'J', '10'].includes(card.rank)) return 10;
  if (card.rank === '5') return 5;
  return 0;
}

function isThreeOfSpades(card) {
  return card.rank === '3' && card.suit === 'S';
}

function buildDeck(playerCount) {
  // Map of card IDs (e.g. "2H") to remove, keyed by player count.
  const removed = new Set();
  if (playerCount === 3) {
    removed.add('2H');
  } else if (playerCount === 5) {
    removed.add('2H');
    removed.add('2D');
  } else if (playerCount === 6) {
    removed.add('2H');
    removed.add('2D');
    removed.add('2S');
    removed.add('2C');
  }
  // 4 players: full 52-card deck.
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = `${rank}${suit}`;
      if (removed.has(id)) continue;
      cards.push({ rank, suit });
    }
  }
  return cards;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(playerCount) {
  const deck = shuffle(buildDeck(playerCount));
  const hands = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, idx) => {
    hands[idx % playerCount].push(card);
  });
  // Sort each hand for display: by suit then rank
  for (const hand of hands) {
    hand.sort((a, b) => {
      if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      return RANK_VALUE[a.rank] - RANK_VALUE[b.rank];
    });
  }
  return hands;
}

// Numeric value used to compare cards within a single trick.
// 3 of Spades beats everything; trump beats non-trump; within a suit, higher rank wins.
function trickValue(card, trumpSuit, ledSuit) {
  if (isThreeOfSpades(card)) return 100000;
  if (card.suit === trumpSuit) return 1000 + RANK_VALUE[card.rank];
  if (card.suit === ledSuit) return RANK_VALUE[card.rank];
  return 0;
}

function resolveTrick(plays, trumpSuit) {
  const ledSuit = plays[0].card.suit;
  let bestIdx = 0;
  let bestVal = trickValue(plays[0].card, trumpSuit, ledSuit);
  for (let i = 1; i < plays.length; i++) {
    const v = trickValue(plays[i].card, trumpSuit, ledSuit);
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return {
    winnerId: plays[bestIdx].playerId,
    points: plays.reduce((s, p) => s + cardPoints(p.card), 0)
  };
}

module.exports = {
  SUITS,
  RANKS,
  RANK_VALUE,
  cardId,
  cardFromId,
  cardPoints,
  isThreeOfSpades,
  buildDeck,
  shuffle,
  deal,
  resolveTrick,
};
