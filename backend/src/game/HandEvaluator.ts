import { Card, Suit, Rank } from './Card';

export enum HandRank {
  HighCard = 1,
  Pair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10,
}

export interface HandResult {
  rank: HandRank;
  cards: Card[];
  value: number; // for tie-breaking
  name: string;
}

export class HandEvaluator {
  
  static evaluate(holeCards: Card[], communityCards: Card[]): HandResult {
    const allCards = [...holeCards, ...communityCards];
    // If not enough cards, return basic (for testing)
    if (allCards.length < 5) throw new Error('Not enough cards to evaluate');
    
    // Sort descending by value
    allCards.sort((a, b) => b.getValue() - a.getValue());

    // Frequencies
    const rankCounts = new Map<number, Card[]>();
    const suitCounts = new Map<Suit, Card[]>();

    for (const card of allCards) {
      const v = card.getValue();
      if (!rankCounts.has(v)) rankCounts.set(v, []);
      rankCounts.get(v)!.push(card);

      const s = card.suit;
      if (!suitCounts.has(s)) suitCounts.set(s, []);
      suitCounts.get(s)!.push(card);
    }

    // Flush check
    let flushCards: Card[] | null = null;
    for (const [suit, cards] of suitCounts.entries()) {
      if (cards.length >= 5) {
        flushCards = cards.slice(0, 5); // already sorted descending
        break;
      }
    }

    // Straight check 
    // Need to handle wheel (A, 2, 3, 4, 5)
    let straightCards = this.getStraight(allCards);
    let straightFlushCards = flushCards ? this.getStraight(flushCards) : null;

    // Checks from strongest to weakest
    if (straightFlushCards) {
      if (straightFlushCards[0].getValue() === 14) {
        return { rank: HandRank.RoyalFlush, cards: straightFlushCards, value: this.calcValue(straightFlushCards), name: 'Royal Flush' };
      }
      return { rank: HandRank.StraightFlush, cards: straightFlushCards, value: this.calcValue(straightFlushCards), name: 'Straight Flush' };
    }

    const quads = this.getGroup(rankCounts, 4);
    if (quads) {
      const kickers = this.getKickers(allCards, quads, 1);
      const finalCards = [...quads, ...kickers];
      return { rank: HandRank.FourOfAKind, cards: finalCards, value: this.calcGroupValue(quads, kickers), name: 'Four of a Kind' };
    }

    const trips = this.getGroup(rankCounts, 3);
    const pairs = this.getPairs(rankCounts);

    if (trips && (pairs.length > 0 || this.getGroup(rankCounts, 3, [trips[0].getValue()]))) {
      // Full house
      let pairForHouse = pairs[0] || this.getGroup(rankCounts, 3, [trips[0].getValue()])!.slice(0, 2);
      const finalCards = [...trips, ...pairForHouse.slice(0, 2)];
      return { rank: HandRank.FullHouse, cards: finalCards, value: this.calcGroupValue(trips, pairForHouse), name: 'Full House' };
    }

    if (flushCards) {
      return { rank: HandRank.Flush, cards: flushCards, value: this.calcValue(flushCards), name: 'Flush' };
    }

    if (straightCards) {
      return { rank: HandRank.Straight, cards: straightCards, value: straightCards[0].getValue(), name: 'Straight' };
    }

    if (trips) {
      const kickers = this.getKickers(allCards, trips, 2);
      return { rank: HandRank.ThreeOfAKind, cards: [...trips, ...kickers], value: this.calcGroupValue(trips, kickers), name: 'Three of a Kind' };
    }

    if (pairs.length >= 2) {
      const twoPair = [...pairs[0], ...pairs[1]];
      const kickers = this.getKickers(allCards, twoPair, 1);
      return { rank: HandRank.TwoPair, cards: [...twoPair, ...kickers], value: this.calcGroupValue(twoPair, kickers), name: 'Two Pair' };
    }

    if (pairs.length === 1) {
      const kickers = this.getKickers(allCards, pairs[0], 3);
      return { rank: HandRank.Pair, cards: [...pairs[0], ...kickers], value: this.calcGroupValue(pairs[0], kickers), name: 'Pair' };
    }

    const highCards = allCards.slice(0, 5);
    return { rank: HandRank.HighCard, cards: highCards, value: this.calcValue(highCards), name: 'High Card' };
  }

  private static getStraight(cards: Card[]): Card[] | null {
    // extract unique values
    const uniqueVals = Array.from(new Set(cards.map(c => c.getValue()))).sort((a, b) => b - a);
    
    // add wheel Ace mapping (A is 14 but can play as 1 implicitly)
    if (uniqueVals.includes(14)) uniqueVals.push(1);

    let straightVals: number[] = [];
    for (let i = 0; i < uniqueVals.length; i++) {
      if (straightVals.length === 0 || uniqueVals[i] === straightVals[straightVals.length - 1] - 1) {
        straightVals.push(uniqueVals[i]);
      } else {
        straightVals = [uniqueVals[i]];
      }
      if (straightVals.length === 5) break;
    }

    if (straightVals.length === 5) {
      // reconstruct cards from straightVals
      const straightCards: Card[] = [];
      for (const val of straightVals) {
        const v = val === 1 ? 14 : val; // Handle wheel Ace
        const card = cards.find(c => c.getValue() === v && !straightCards.includes(c));
        if (card) straightCards.push(card);
      }
      return straightCards;
    }
    return null;
  }

  private static getGroup(rankCounts: Map<number, Card[]>, count: number, ignoreVals: number[] = []): Card[] | null {
    // Iterates from highest rank to lowest because it's a map (actually maps maintain insertion order but we can sort keys)
    const sortedKeys = Array.from(rankCounts.keys()).sort((a, b) => b - a);
    for (const key of sortedKeys) {
      if (ignoreVals.includes(key)) continue;
      const grp = rankCounts.get(key)!;
      if (grp.length >= count) {
        return grp.slice(0, count);
      }
    }
    return null;
  }

  private static getPairs(rankCounts: Map<number, Card[]>): Card[][] {
    const pairs: Card[][] = [];
    const sortedKeys = Array.from(rankCounts.keys()).sort((a, b) => b - a);
    for (const key of sortedKeys) {
      const grp = rankCounts.get(key)!;
      if (grp.length === 2) { // strictly genuine pairs — trips/quads are handled separately
        pairs.push(grp.slice(0, 2));
      }
    }
    return pairs;
  }

  private static getKickers(allCards: Card[], exclude: Card[], count: number): Card[] {
    return allCards.filter(c => !exclude.includes(c)).slice(0, count);
  }

  // hex calculation to easily compare hands: e.g. A, K, Q, J, 9 -> 0x0E0D0C0B09
  private static calcValue(cards: Card[]): number {
    let val = 0;
    for (let i = 0; i < cards.length; i++) {
        // Shift by 4 bits for each card value (max 14 fits in 4 bits)
        val = (val << 4) | cards[i].getValue();
    }
    return val;
  }

  private static calcGroupValue(primary: Card[], kickers: Card[]): number {
      let val = 0;
      // Primary group (quads, trips, pair) matters most
      for(let card of primary) { val = (val << 4) | card.getValue(); }
      // Then kickers
      for(let card of kickers) { val = (val << 4) | card.getValue(); }
      return val;
  }
}
