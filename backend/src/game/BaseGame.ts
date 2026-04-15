import { Player } from './Player';
import { calculateTransactions } from '../utils/settlement';

export abstract class BaseGame {
  public id: string;
  public players: Player[] = [];
  public maxPlayers: number;
  public state: string = 'waiting';
  public gameType: 'FAKE' | 'REAL' = 'FAKE';
  public gameName: 'POKER' | 'TEEN_PATTI' = 'POKER';
  public entryAmount: number = 0;
  public settlements: any[] = [];

  public winMessage: string = '';
  public winnerIds: string[] = [];

  public smallBlindAmt: number;
  public bigBlindAmt: number;

  public dealerIndex: number = 0;
  public currentTurnIndex: number = -1;

  // Turn timer state
  public turnDeadline: number = 0;
  public pendingTurnTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    id: string,
    maxPlayers: number,
    smallBlind: number,
    bigBlind: number,
    gameType: 'FAKE' | 'REAL',
    gameName: 'POKER' | 'TEEN_PATTI',
    entryAmount: number
  ) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.smallBlindAmt = smallBlind;
    this.bigBlindAmt = bigBlind;
    this.gameType = gameType;
    this.gameName = gameName;
    this.entryAmount = entryAmount;
  }

  public addPlayer(player: Player): boolean {
    if (this.players.length >= this.maxPlayers) return false;
    if (this.players.find(p => p.id === player.id)) return false;
    this.players.push(player);
    return true;
  }

  public removePlayer(playerId: string) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return;

    const player = this.players[index];

    // Calculate settlement before removing
    const chipsAtExit = player.chips + player.currentBet;
    const entryChips = 10000;
    const valueInRupees = (chipsAtExit / entryChips) * this.entryAmount;
    const netAmount = valueInRupees - this.entryAmount;

    this.settlements.push({
      playerId: player.id,
      username: player.username,
      chipsAtExit,
      valueInRupees: parseFloat(valueInRupees.toFixed(2)),
      netAmount: parseFloat(netAmount.toFixed(2)),
      status: netAmount >= 0 ? 'WIN' : 'LOSS',
      time: new Date().toISOString()
    });

    // If mid-game and it's their turn, fold or pack them first
    if (
      this.state !== 'waiting' &&
      this.state !== 'showdown' &&
      this.currentTurnIndex === index
    ) {
      if (this.gameName === 'POKER') {
        this.handleAction(playerId, 'fold');
      } else {
        this.handleAction(playerId, 'pack');
      }
    }

    this.players.splice(index, 1);

    // Adjust indices after splice
    if (index < this.dealerIndex) this.dealerIndex--;
    if (index < this.currentTurnIndex) this.currentTurnIndex--;

    if (this.dealerIndex >= this.players.length) this.dealerIndex = 0;
    if (this.currentTurnIndex >= this.players.length) this.currentTurnIndex = 0;
  }

  public cleanUpPlayers() {
    this.players = this.players.filter(p => p.chips > 0);
    this.players.forEach(p => {
      p.lastAction = '';
      p.hasActed = false;
    });
    this.winMessage = '';
    this.winnerIds = [];
    this.turnDeadline = 0;
    if (this.players.length < 2) this.state = 'waiting';
  }

  protected calculateCurrentInstructions() {
    if (this.gameType !== 'REAL') return [];

    const participants: { name: string; net: number }[] = [];

    this.settlements.forEach(s => {
      participants.push({ name: s.username, net: s.netAmount });
    });

    this.players.forEach(p => {
      const chipsAtNow = p.chips + p.currentBet;
      const valueInRupees = (chipsAtNow / 10000) * this.entryAmount;
      const netAmount = parseFloat((valueInRupees - this.entryAmount).toFixed(2));
      participants.push({ name: p.username, net: netAmount });
    });

    return calculateTransactions(participants);
  }

  public abstract startGame(): boolean;
  public abstract handleAction(playerId: string, action: string, amount?: number): boolean;
  public abstract getPublicState(viewerSocketId?: string): any;
  public abstract resetPotsAndCards(): void;
}
