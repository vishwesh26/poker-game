import { Card } from './Card';

export class Player {
  public id: string; // Database ID (UUID)
  public socketId: string;
  public username: string;
  public chips: number;
  public avatarUrl: string;

  // Active game state
  public hand: Card[] = [];
  public currentBet: number = 0;        // chips committed in the CURRENT street
  public totalContributed: number = 0;  // chips committed across ALL streets this hand (for side pots)
  public hasFolded: boolean = false;
  public hasActed: boolean = false;     // For the current betting round
  public isAllIn: boolean = false;
  public lastAction: string = '';
  public lastActionTime: number = 0;
  public isBot: boolean = false;

  constructor(id: string, socketId: string, username: string, avatarUrl: string, initialChips: number = 10000) {
    this.id = id;
    this.socketId = socketId;
    this.username = username;
    this.avatarUrl = avatarUrl;
    this.chips = initialChips;
  }

  /** Called at the start of each new hand (not each street) */
  public resetForNewRound() {
    this.hand = [];
    this.currentBet = 0;
    this.totalContributed = 0; // reset per hand
    this.hasFolded = false;
    this.hasActed = false;
    this.lastAction = '';
    this.isAllIn = this.chips === 0;
  }

  /** To be sent to clients — masks hole cards unless it's the viewer's own hand or showdown */
  public getPublicState(showCards: boolean = false) {
    return {
      id: this.id,
      username: this.username,
      avatarUrl: this.avatarUrl,
      chips: this.chips,
      currentBet: this.currentBet,
      hasFolded: this.hasFolded,
      isAllIn: this.isAllIn,
      hasActed: this.hasActed,
      lastAction: this.lastAction,
      isBot: this.isBot,
      hand: showCards
        ? this.hand
        : (this.hand.length > 0 ? [{ rank: '?', suit: '?' }, { rank: '?', suit: '?' }] : [])
    };
  }
}
