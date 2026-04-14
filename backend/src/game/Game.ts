import { Card } from './Card';
import { Deck } from './Deck';
import { Player } from './Player';
import { HandEvaluator, HandResult } from './HandEvaluator';
import { calculateTransactions } from '../utils/settlement';

export type GameState = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export class Game {
  public id: string;
  public players: Player[] = [];
  public maxPlayers: number;
  public state: GameState = 'waiting';
  public gameType: 'FAKE' | 'REAL' = 'FAKE';
  public entryAmount: number = 0;
  public settlements: any[] = [];
  
  public smallBlindAmt: number;
  public bigBlindAmt: number;
  
  public deck: Deck;
  public communityCards: Card[] = [];
  public pot: number = 0;
  
  public dealerIndex: number = 0;
  public currentTurnIndex: number = -1;
  public currentHighestBet: number = 0;
  public lastRaiseAmount: number = 0;

  constructor(id: string, maxPlayers: number = 6, smallBlind: number = 10, bigBlind: number = 20, gameType: 'FAKE' | 'REAL' = 'FAKE', entryAmount: number = 0) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.smallBlindAmt = smallBlind;
    this.bigBlindAmt = bigBlind;
    this.gameType = gameType;
    this.entryAmount = entryAmount;
    this.deck = new Deck();
  }

  // == Player Management ==
  public addPlayer(player: Player): boolean {
    if (this.players.length >= this.maxPlayers) return false;
    // Don't add duplicate
    if (this.players.find(p => p.id === player.id)) return false;
    this.players.push(player);
    return true;
  }

  public removePlayer(playerId: string) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return;

    const player = this.players[index];

    // Calculate Settlement before removing
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

    // If mid-game and it's their turn, we MUST fold them first to advance game gracefully
    if (this.state !== 'waiting' && this.state !== 'showdown' && this.currentTurnIndex === index) {
      this.handleAction(playerId, 'fold');
    }

    this.players.splice(index, 1);

    // Adjust indices
    if (index < this.dealerIndex) this.dealerIndex--;
    if (index < this.currentTurnIndex) this.currentTurnIndex--;

    // Bounds check
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
    if (this.players.length < 2) this.state = 'waiting';
  }

  // == Game Loop Basics ==
  public startGame() {
    if (this.players.length < 2) return false;

    this.state = 'preflop';
    this.deck = new Deck(); // fresh shuffle
    this.communityCards = [];
    this.pot = 0;
    this.currentHighestBet = this.bigBlindAmt;
    this.lastRaiseAmount = this.bigBlindAmt;

    // Reset players
    this.players.forEach(p => p.resetForNewRound());

    // Move dealer
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

    this.postBlinds();
    this.dealHoleCards();
    return true;
  }

  private postBlinds() {
    const sbIndex = (this.dealerIndex + 1) % this.players.length;
    const bbIndex = (this.dealerIndex + 2) % this.players.length;

    const sbPlayer = this.players[sbIndex];
    if (sbPlayer) {
      this.pot += Math.min(this.smallBlindAmt, sbPlayer.chips);
      sbPlayer.currentBet = Math.min(this.smallBlindAmt, sbPlayer.chips);
      sbPlayer.chips -= sbPlayer.currentBet;
    }

    const bbPlayer = this.players[bbIndex];
    if (bbPlayer) {
      this.pot += Math.min(this.bigBlindAmt, bbPlayer.chips);
      bbPlayer.currentBet = Math.min(this.bigBlindAmt, bbPlayer.chips);
      bbPlayer.chips -= bbPlayer.currentBet;
      this.currentHighestBet = bbPlayer.currentBet;
    }

    // Action starts left of BB
    this.currentTurnIndex = (this.dealerIndex + 3) % this.players.length;
  }

  private dealHoleCards() {
    for (let current of this.players) {
      current.hand = [this.deck.draw()!, this.deck.draw()!];
    }
  }

  // == Actions ==
  public handleAction(playerId: string, action: 'fold' | 'check' | 'call' | 'raise', amount?: number): boolean {
    const p = this.players[this.currentTurnIndex];
    if (!p || p.id !== playerId) return false; // not their turn

    p.hasActed = true;

    if (action === 'fold') {
      p.hasFolded = true;
      p.lastAction = 'Folded';
    } else if (action === 'check') {
      if (p.currentBet < this.currentHighestBet && p.chips > 0) return false; // Must call or fold
      p.lastAction = 'Checked';
    } else if (action === 'call') {
      const callDiff = this.currentHighestBet - p.currentBet;
      const actualCall = Math.min(callDiff, p.chips);
      p.currentBet += actualCall;
      p.chips -= actualCall;
      this.pot += actualCall;
      p.lastAction = actualCall === 0 ? 'Checked' : `Called $${actualCall}`;
      if (p.chips === 0) p.isAllIn = true;
    } else if (action === 'raise') {
      // Poker Rule: Min raise must be at least the previous raise amount
      const minRaise = this.currentHighestBet + this.lastRaiseAmount;
      if (!amount || amount < minRaise) return false;
      
      const raiseDiff = amount - p.currentBet;
      if (raiseDiff > p.chips) return false;

      const previousHighest = this.currentHighestBet;
      p.currentBet += raiseDiff;
      p.chips -= raiseDiff;
      this.pot += raiseDiff;
      this.currentHighestBet = amount;
      this.lastRaiseAmount = this.currentHighestBet - previousHighest;
      p.lastAction = `Raised to $${amount}`;

      if (p.chips === 0) p.isAllIn = true;

      // Reset hasActed for everyone else because bet amount changed
      this.players.forEach(op => {
          if (op.id !== p.id && !op.hasFolded && !op.isAllIn) op.hasActed = false;
      });
    }

    this.advanceTurn();
    return true;
  }

  private advanceTurn() {
    const activePlayers = this.players.filter(p => !p.hasFolded);
    if (activePlayers.length === 1) {
      // everyone folded
      this.awardPot(activePlayers[0]);
      return;
    }

    // Check if betting round is over
    const activeAndNotAllIn = activePlayers.filter(p => !p.isAllIn);
    
    // Round is over if all active players (who aren't all-in) have acted AND match the highest bet
    let roundOver = true;
    for (const p of activeAndNotAllIn) {
      if (!p.hasActed || p.currentBet < this.currentHighestBet) {
        roundOver = false;
        break;
      }
    }

    if (roundOver) {
        this.nextStage();
        return;
    }

    // Move to next player
    let loops = 0;
    while(loops < this.players.length) {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      const np = this.players[this.currentTurnIndex];
      if (!np.hasFolded && !np.isAllIn) break;
      loops++;
    }
  }

  private nextStage() {
    // Reset round bets
    this.players.forEach(p => { 
        p.currentBet = 0;
        p.hasActed = false;
    });
    this.currentHighestBet = 0;
    this.currentTurnIndex = (this.dealerIndex + 1) % this.players.length;

    // Fast-forward to next active player if sb folded
    let loops = 0;
    while(loops < this.players.length) {
      const np = this.players[this.currentTurnIndex];
      if (!np.hasFolded && !np.isAllIn) break;
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      loops++;
    }

    if (this.state === 'preflop') {
      this.state = 'flop';
      this.communityCards = [this.deck.draw()!, this.deck.draw()!, this.deck.draw()!];
    } else if (this.state === 'flop') {
      this.state = 'turn';
      this.communityCards.push(this.deck.draw()!);
    } else if (this.state === 'turn') {
      this.state = 'river';
      this.communityCards.push(this.deck.draw()!);
    } else if (this.state === 'river') {
      this.state = 'showdown';
      this.evaluateShowdown();
    }
    
    // Auto advance if players are all in
    const activeAndNotAllIn = this.players.filter(p => !p.hasFolded && !p.isAllIn);
    if (activeAndNotAllIn.length <= 1 && this.state !== 'showdown') {
         // Recursive fast-forward to showdown
         this.nextStage();
    }
  }

  public winMessage: string = '';
  public winnerIds: string[] = [];

  private evaluateShowdown() {
    const activePlayers = this.players.filter(p => !p.hasFolded);
    if (activePlayers.length === 1) {
        this.awardPot(activePlayers[0]);
        return;
    }

    let bestHands = activePlayers.map(p => ({
        player: p,
        result: HandEvaluator.evaluate(p.hand, this.communityCards)
    }));

    bestHands.sort((a, b) => {
        if (b.result.rank !== a.result.rank) return b.result.rank - a.result.rank;
        return b.result.value - a.result.value;
    });

    const topHand = bestHands[0];
    const winners = bestHands.filter(h => h.result.rank === topHand.result.rank && h.result.value === topHand.result.value);

    // Keep the state at showdown so clients see the reveal
    this.state = 'showdown';
    this.winnerIds = winners.map(w => w.player.id);

    const splitAmt = Math.floor(this.pot / winners.length);
    winners.forEach(w => w.player.chips += splitAmt);
    
    const winnerNames = winners.map(w => w.player.username).join(' and ');
    this.winMessage = `${winnerNames} won $${this.pot} with ${topHand.result.name}!`;
    this.pot = 0;
  }

  private awardPot(winner: Player) {
    this.state = 'showdown';
    this.winnerIds = [winner.id];
    winner.chips += this.pot;
    this.winMessage = `${winner.username} won $${this.pot} (Everyone Folded)`;
    this.pot = 0;
  }

  private calculateCurrentInstructions() {
    if (this.gameType !== 'REAL') return [];

    const participants: { name: string, net: number }[] = [];

    // Add exited players
    this.settlements.forEach(s => {
       participants.push({ name: s.username, net: s.netAmount });
    });

    // Add active players
    this.players.forEach(p => {
       const chipsAtNow = p.chips + p.currentBet;
       const valueInRupees = (chipsAtNow / 10000) * this.entryAmount;
       const netAmount = parseFloat((valueInRupees - this.entryAmount).toFixed(2));
       participants.push({ name: p.username, net: netAmount });
    });

    return calculateTransactions(participants);
  }

  public getPublicState(viewerSocketId?: string) {
    return {
      id: this.id,
      state: this.state,
      pot: this.pot,
      communityCards: this.communityCards,
      currentTurnIndex: this.currentTurnIndex,
      dealerIndex: this.dealerIndex,
      currentHighestBet: this.currentHighestBet,
      lastRaiseAmount: this.lastRaiseAmount,
      gameType: this.gameType,
      entryAmount: this.entryAmount,
      settlements: this.settlements,
      instructions: this.calculateCurrentInstructions(),
      winMessage: this.winMessage,
      winnerIds: this.winnerIds,
      players: this.players.map(p => p.getPublicState(this.state === 'showdown' || p.socketId === viewerSocketId))
    };
  }
}
