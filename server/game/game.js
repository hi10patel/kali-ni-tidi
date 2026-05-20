const {
  deal,
  resolveTrick,
  cardId,
  buildDeck,
  SUITS,
} = require('./deck');

class Game {
  constructor(roomCode, players) {
    this.roomCode = roomCode;
    this.players = players.map(p => ({ id: p.id, name: p.name }));
    this.playerCount = this.players.length;

    this.state = 'bidding';
    this.hands = {};

    this.bids = {};                                           // playerId -> latest bid amount, or 'pass' once dropped
    this.activeBidderIds = new Set(this.players.map(p => p.id)); // still in the auction
    this.currentBidderIdx = 0;
    this.highestBid = 0;
    this.highestBidderId = null;

    this.trumpSuit = null;
    this.partnerCards = [];
    this.revealedPartners = new Set();
    this.biddingTeamIds = new Set();
    this.allPartnerHolderIds = new Set();

    this.currentTrick = [];
    this.leaderIdx = 0;
    this.activeIdx = 0;
    this.trickHistory = [];

    this.teamPoints = { bidding: 0, opposing: 0 };
    this.finalResult = null;

    this._deal();
  }

  _deal() {
    const hands = deal(this.playerCount);
    this.players.forEach((p, i) => {
      this.hands[p.id] = hands[i];
    });
  }

  _playerIdx(playerId) {
    return this.players.findIndex(p => p.id === playerId);
  }

  placeBid(playerId, bidAmount) {
    if (this.state !== 'bidding') throw new Error('Not in bidding phase');
    if (this.players[this.currentBidderIdx].id !== playerId) throw new Error('Not your turn');
    if (!this.activeBidderIds.has(playerId)) throw new Error('You already gave up');

    if (bidAmount === 'pass') {
      // "Give up" — drop out of the auction permanently.
      if (this.highestBidderId === null) {
        throw new Error('Opening bidder must place a bid (150+)');
      }
      if (this.highestBidderId === playerId) {
        throw new Error('You hold the highest bid — you cannot give up');
      }
      this.bids[playerId] = 'pass';
      this.activeBidderIds.delete(playerId);
    } else {
      if (!Number.isInteger(bidAmount) || bidAmount < 150 || bidAmount > 250 || bidAmount % 5 !== 0) {
        throw new Error('Bid must be 150-250 in multiples of 5');
      }
      if (bidAmount <= this.highestBid) throw new Error('Bid must exceed current highest bid');
      this.bids[playerId] = bidAmount;
      this.highestBid = bidAmount;
      this.highestBidderId = playerId;
    }

    this._advanceBid();
  }

  _advanceBid() {
    // Find next active player who is NOT the current high bidder.
    // (The high bidder doesn't need to act until someone challenges them.)
    for (let i = 1; i <= this.playerCount; i++) {
      const idx = (this.currentBidderIdx + i) % this.playerCount;
      const id = this.players[idx].id;
      if (this.activeBidderIds.has(id) && id !== this.highestBidderId) {
        this.currentBidderIdx = idx;
        return;
      }
    }
    // No one left to challenge — the high bidder wins.
    if (this.highestBidderId) {
      this.currentBidderIdx = this._playerIdx(this.highestBidderId);
      this.state = 'trump';
    }
    // (We never end without a highestBidder because the opening bidder cannot
    // give up; first action must always be a bid.)
  }

  selectTrump(playerId, suit) {
    if (this.state !== 'trump') throw new Error('Not in trump phase');
    if (playerId !== this.highestBidderId) throw new Error('Only bidder can select trump');
    if (!SUITS.includes(suit)) throw new Error('Invalid suit');
    this.trumpSuit = suit;
    this.state = 'partner';
  }

  declarePartners(playerId, cardIds) {
    if (this.state !== 'partner') throw new Error('Not in partner phase');
    if (playerId !== this.highestBidderId) throw new Error('Only bidder declares partners');
    const expected = this.playerCount >= 5 ? 2 : 1;
    if (!Array.isArray(cardIds) || cardIds.length !== expected) {
      throw new Error(`Must name exactly ${expected} card(s)`);
    }
    if (new Set(cardIds).size !== cardIds.length) {
      throw new Error('Cannot name the same card twice');
    }

    const deckIds = new Set(buildDeck(this.playerCount).map(cardId));
    const bidderHand = new Set(this.hands[playerId].map(cardId));
    for (const cid of cardIds) {
      if (!deckIds.has(cid)) throw new Error(`Card ${cid} not in deck for ${this.playerCount} players`);
      if (bidderHand.has(cid)) throw new Error('Cannot name a card you hold');
    }

    this.partnerCards = cardIds.slice();

    for (const p of this.players) {
      if (p.id === playerId) continue;
      const hand = new Set(this.hands[p.id].map(cardId));
      for (const cid of cardIds) {
        if (hand.has(cid)) this.allPartnerHolderIds.add(p.id);
      }
    }
    this.biddingTeamIds.add(playerId);

    this.state = 'playing';
    this.leaderIdx = this._playerIdx(playerId);
    this.activeIdx = this.leaderIdx;
  }

  playCard(playerId, cardIdStr) {
    if (this.state !== 'playing') throw new Error('Not in play phase');
    if (this.players[this.activeIdx].id !== playerId) throw new Error('Not your turn');
    const hand = this.hands[playerId];
    const cardIdx = hand.findIndex(c => cardId(c) === cardIdStr);
    if (cardIdx < 0) throw new Error('You do not have that card');
    const card = hand[cardIdx];

    if (this.currentTrick.length > 0) {
      const ledSuit = this.currentTrick[0].card.suit;
      const hasLed = hand.some(c => c.suit === ledSuit);
      if (hasLed && card.suit !== ledSuit) throw new Error('Must follow suit');
    }

    hand.splice(cardIdx, 1);
    this.currentTrick.push({ playerId, card });

    if (this.partnerCards.includes(cardIdStr) && !this.revealedPartners.has(playerId) && playerId !== this.highestBidderId) {
      this.revealedPartners.add(playerId);
      this.biddingTeamIds.add(playerId);
    }

    if (this.currentTrick.length === this.playerCount) {
      this._completeTrick();
    } else {
      this.activeIdx = (this.activeIdx + 1) % this.playerCount;
    }
  }

  _completeTrick() {
    const { winnerId, points } = resolveTrick(this.currentTrick, this.trumpSuit);
    this.trickHistory.push({
      plays: this.currentTrick.slice(),
      winnerId,
      points,
    });
    if (this.biddingTeamIds.has(winnerId)) {
      this.teamPoints.bidding += points;
    } else {
      this.teamPoints.opposing += points;
    }
    this.currentTrick = [];
    this.leaderIdx = this._playerIdx(winnerId);
    this.activeIdx = this.leaderIdx;

    const handsEmpty = this.players.every(p => this.hands[p.id].length === 0);
    if (handsEmpty) this._endGame();
  }

  _endGame() {
    this.state = 'finished';
    // Re-tally with full partner set so unrevealed partners' tricks count for the bidding team too.
    const fullBiddingTeam = new Set([this.highestBidderId, ...this.allPartnerHolderIds]);
    let biddingPoints = 0;
    let opposingPoints = 0;
    for (const trick of this.trickHistory) {
      if (fullBiddingTeam.has(trick.winnerId)) biddingPoints += trick.points;
      else opposingPoints += trick.points;
    }
    const success = biddingPoints >= this.highestBid;
    this.finalResult = {
      bid: this.highestBid,
      trump: this.trumpSuit,
      bidderId: this.highestBidderId,
      partnerCards: this.partnerCards,
      partnerIds: [...this.allPartnerHolderIds],
      biddingPoints,
      opposingPoints,
      success,
      perPlayer: this.players.map(p => {
        const earned = this.trickHistory
          .filter(t => t.winnerId === p.id)
          .reduce((s, t) => s + t.points, 0);
        return {
          id: p.id,
          name: p.name,
          team: fullBiddingTeam.has(p.id) ? 'bidding' : 'opposing',
          points: earned,
        };
      }),
    };
  }

  view(playerId) {
    const isBidder = playerId === this.highestBidderId;
    const showPartnerCards = isBidder || this.state === 'finished';
    const v = {
      roomCode: this.roomCode,
      state: this.state,
      playerCount: this.playerCount,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        handCount: this.hands[p.id] ? this.hands[p.id].length : 0,
        revealedPartner: this.revealedPartners.has(p.id),
        points: this.trickHistory
          .filter(t => t.winnerId === p.id)
          .reduce((s, t) => s + t.points, 0),
        isBidder: p.id === this.highestBidderId,
      })),
      yourHand: this.hands[playerId] || [],
      bids: this.bids,
      activeBidderIds: [...this.activeBidderIds],
      currentBidderId: this.state === 'bidding' ? this.players[this.currentBidderIdx].id : null,
      highestBid: this.highestBid,
      highestBidderId: this.highestBidderId,
      // Threshold the opposing team needs to REACH to defeat the bid.
      // Total deck = 250 pts. Bidder needs >= bid; opponents win if bidder < bid.
      // All point values are multiples of 5, so the smallest losing total for the
      // bidder is (bid - 5). That means opponents must get >= 250 - (bid - 5) = 255 - bid.
      opposingTarget: this.highestBid ? (255 - this.highestBid) : 0,
      trumpSuit: this.trumpSuit,
      partnerCards: showPartnerCards ? this.partnerCards : [],
      partnerCount: this.partnerCards.length, // public count — everyone knows how many partners exist
      revealedPartners: [...this.revealedPartners],
      currentTrick: this.currentTrick,
      lastTrick: this.trickHistory.length > 0 ? this.trickHistory[this.trickHistory.length - 1] : null,
      activePlayerId: this._activePlayerId(),
      teamPoints: this.teamPoints,
      finalResult: this.finalResult,
      tricksPlayed: this.trickHistory.length,
    };
    if (this.state === 'partner' && isBidder) {
      const myHand = new Set(this.hands[playerId].map(cardId));
      v.availablePartnerCards = buildDeck(this.playerCount).filter(c => !myHand.has(cardId(c)));
      v.partnerCardsExpected = this.playerCount >= 5 ? 2 : 1;
    }
    return v;
  }

  _activePlayerId() {
    if (this.state === 'bidding') return this.players[this.currentBidderIdx].id;
    if (this.state === 'trump' || this.state === 'partner') return this.highestBidderId;
    if (this.state === 'playing') return this.players[this.activeIdx].id;
    return null;
  }
}

module.exports = { Game };
