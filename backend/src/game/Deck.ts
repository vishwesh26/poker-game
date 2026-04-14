import { Card, Suit, Rank } from './Card';

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.initialize();
    this.shuffle();
  }

  private initialize() {
    this.cards = [];
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(new Card(rank, suit));
      }
    }
  }

  // Fisher-Yates Shuffle
  public shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public draw(): Card | undefined {
    return this.cards.pop();
  }

  public getRemainingCount(): number {
    return this.cards.length;
  }
}
