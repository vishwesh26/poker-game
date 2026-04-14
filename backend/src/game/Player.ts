import { Card } from './Card';

export class Player {
  public id: string; // Database ID (UUID)
  public socketId: string;
  public username: string;
  public chips: number;
  public avatarUrl: string;

  // Active game state
  public hand: Card[] = [];
  public currentBet: number = 0;
  public hasFolded: boolean = false;
  public hasActed: boolean = false; // For the current betting round
  public isAllIn: boolean = false;
  public lastAction: string = '';
  public lastActionTime: number = 0;

  constructor(id: string, socketId: string, username: string, avatarUrl: string, initialChips: number = 10000) {
    this.id = id;
    this.socketId = socketId;
    this.username = username;
    this.avatarUrl = avatarUrl;
    this.chips = initialChips;
  }

  public resetForNewRound() {
    this.hand = [];
    this.currentBet = 0;
    this.hasFolded = false;
    this.hasActed = false;
    this.lastAction = '';
    this.isAllIn = this.chips === 0;
  }

  // To be sent to clients (masking cards if needed)
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
      hand: showCards ? this.hand : (this.hand.length > 0 ? [{rank:'?',suit:'?'}, {rank:'?',suit:'?'}] : [])
    };
  }
}
