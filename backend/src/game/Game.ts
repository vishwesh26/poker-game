import { Card } from './Card';
import { Deck } from './Deck';
import { Player } from './Player';
import { HandEvaluator } from './HandEvaluator';
import { calculateTransactions } from '../utils/settlement';

export type GameState = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

/** A discrete pot that only a subset of players are eligible to win */
interface SidePot {
  amount: number;
  eligibleIds: string[]; // player IDs who can contest this pot
}

export class Game {
  public id: string;
  public players: Player[] = [];
  public maxPlayers: number;
  public state: GameState = 'waiting';
  public gameType: 'FAKE' | 'REAL' = 'FAKE';
  public entryAmount: number = 0;
  public settlements: any[] = [];

  // Win state — declared at top to avoid ordering issues in cleanUpPlayers
  public winMessage: string = '';
  public winnerIds: string[] = [];
  public lastHandPots: SidePot[] = []; // populated at showdown for UI display

  public smallBlindAmt: number;
  public bigBlindAmt: number;

  public deck: Deck;
  public communityCards: Card[] = [];
  public pot: number = 0; // running chip total (for live display)

  public dealerIndex: number = 0;
  public currentTurnIndex: number = -1;
  public currentHighestBet: number = 0;
  public lastRaiseAmount: number = 0;

  // Turn timer state — deadline timestamp (ms); managed by socket.ts
  public turnDeadline: number = 0;
  public pendingTurnTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    id: string,
    maxPlayers: number = 6,
    smallBlind: number = 10,
    bigBlind: number = 20,
    gameType: 'FAKE' | 'REAL' = 'FAKE',
    entryAmount: number = 0
  ) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.smallBlindAmt = smallBlind;
    this.bigBlindAmt = bigBlind;
    this.gameType = gameType;
    this.entryAmount = entryAmount;
    this.deck = new Deck();
  }

  // ── Player Management ──────────────────────────────────────────────────

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

    // If mid-game and it's their turn, fold them first to advance game gracefully
    if (
      this.state !== 'waiting' &&
      this.state !== 'showdown' &&
      this.currentTurnIndex === index
    ) {
      this.handleAction(playerId, 'fold');
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
    this.lastHandPots = [];
    this.turnDeadline = 0;
    if (this.players.length < 2) this.state = 'waiting';
  }

  // ── Game Loop ──────────────────────────────────────────────────────────

  public startGame(): boolean {
    if (this.players.length < 2) return false;

    this.state = 'preflop';
    this.deck = new Deck(); // fresh shuffle
    this.communityCards = [];
    this.pot = 0;
    this.currentHighestBet = this.bigBlindAmt;
    this.lastRaiseAmount = this.bigBlindAmt;
    this.winMessage = '';
    this.winnerIds = [];
    this.lastHandPots = [];

    this.players.forEach(p => p.resetForNewRound());

    // Rotate dealer
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
      const bet = Math.min(this.smallBlindAmt, sbPlayer.chips);
      this.pot += bet;
      sbPlayer.currentBet = bet;
      sbPlayer.chips -= bet;
      sbPlayer.totalContributed += bet;
      if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;
    }

    const bbPlayer = this.players[bbIndex];
    if (bbPlayer) {
      const bet = Math.min(this.bigBlindAmt, bbPlayer.chips);
      this.pot += bet;
      bbPlayer.currentBet = bet;
      bbPlayer.chips -= bet;
      bbPlayer.totalContributed += bet;
      this.currentHighestBet = bbPlayer.currentBet;
      if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;
    }

    // Action starts left of BB
    this.currentTurnIndex = (this.dealerIndex + 3) % this.players.length;
  }

  private dealHoleCards() {
    for (const player of this.players) {
      player.hand = [this.deck.draw()!, this.deck.draw()!];
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────

  public handleAction(
    playerId: string,
    action: 'fold' | 'check' | 'call' | 'raise',
    amount?: number
  ): boolean {
    const p = this.players[this.currentTurnIndex];
    if (!p || p.id !== playerId) return false; // not their turn

    p.hasActed = true;

    if (action === 'fold') {
      p.hasFolded = true;
      p.lastAction = 'Folded';

    } else if (action === 'check') {
      if (p.currentBet < this.currentHighestBet && p.chips > 0) return false;
      p.lastAction = 'Checked';

    } else if (action === 'call') {
      const callDiff = this.currentHighestBet - p.currentBet;
      const actualCall = Math.min(callDiff, p.chips);
      p.currentBet += actualCall;
      p.chips -= actualCall;
      p.totalContributed += actualCall;
      this.pot += actualCall;
      p.lastAction = actualCall === 0 ? 'Checked' : `Called $${actualCall}`;
      if (p.chips === 0) p.isAllIn = true;

    } else if (action === 'raise') {
      // Poker Rule: min raise must be at least the size of the last raise
      const minRaise = this.currentHighestBet + this.lastRaiseAmount;
      if (!amount || amount < minRaise) return false;

      const raiseDiff = amount - p.currentBet;
      if (raiseDiff > p.chips) return false;

      const previousHighest = this.currentHighestBet;
      p.currentBet += raiseDiff;
      p.chips -= raiseDiff;
      p.totalContributed += raiseDiff;
      this.pot += raiseDiff;
      this.currentHighestBet = amount;
      this.lastRaiseAmount = this.currentHighestBet - previousHighest;
      p.lastAction = `Raised to $${amount}`;

      if (p.chips === 0) p.isAllIn = true;

      // Reset hasActed for everyone else — they must respond to the new price
      this.players.forEach(op => {
        if (op.id !== p.id && !op.hasFolded && !op.isAllIn) op.hasActed = false;
      });
    }

    this.advanceTurn();
    return true;
  }

  private advanceTurn() {
    const activePlayers = this.players.filter(p => !p.hasFolded);

    // Everyone else folded — award pot immediately
    if (activePlayers.length === 1) {
      this.awardPot(activePlayers[0]);
      return;
    }

    // Round is over when all active, non-all-in players have acted AND matched the highest bet
    const activeAndNotAllIn = activePlayers.filter(p => !p.isAllIn);
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

    // Move to the next eligible player
    let loops = 0;
    while (loops < this.players.length) {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      const np = this.players[this.currentTurnIndex];
      if (!np.hasFolded && !np.isAllIn) break;
      loops++;
    }
  }

  private nextStage() {
    // Reset per-street bets for everyone
    this.players.forEach(p => {
      p.currentBet = 0;
      p.hasActed = false;
    });
    this.currentHighestBet = 0;

    // Action starts from SB (left of dealer)
    this.currentTurnIndex = (this.dealerIndex + 1) % this.players.length;
    let loops = 0;
    while (loops < this.players.length) {
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
      return; // skip auto-advance check below
    }

    // Auto fast-forward to showdown if ≤1 player is not all-in (run it out)
    const activeAndNotAllIn = this.players.filter(p => !p.hasFolded && !p.isAllIn);
    if (activeAndNotAllIn.length <= 1 && this.state !== 'showdown') {
      this.nextStage();
    }
  }

  // ── Side Pot Building ─────────────────────────────────────────────────

  /**
   * Builds the correct set of side pots from player totalContributed values.
   *
   * Algorithm: for each unique all-in contribution level (ascending), collect
   * the slice all players contributed up to that level and produce a pot that
   * only non-folded players at-or-above that level may win.
   */
  private buildSidePots(): SidePot[] {
    // Non-folded players sorted ascending by total contribution
    const activeSorted = this.players
      .filter(p => !p.hasFolded)
      .sort((a, b) => a.totalContributed - b.totalContributed);

    if (activeSorted.length === 0) return [];

    const pots: SidePot[] = [];
    let prevCap = 0;

    for (const activePlayer of activeSorted) {
      const cap = activePlayer.totalContributed;
      if (cap <= prevCap) continue; // same level, already accounted for

      const layer = cap - prevCap;

      // Every player (including folded) who contributed beyond prevCap
      // adds `min(layer, their_remaining)` to this pot layer
      let potAmount = 0;
      for (const p of this.players) {
        const contribution = Math.min(layer, Math.max(0, p.totalContributed - prevCap));
        potAmount += contribution;
      }

      // Only non-folded players with contribution >= cap can win this pot
      const eligible = activeSorted
        .filter(p => p.totalContributed >= cap)
        .map(p => p.id);

      pots.push({ amount: potAmount, eligibleIds: eligible });
      prevCap = cap;
    }

    return pots;
  }

  // ── Showdown ───────────────────────────────────────────────────────────

  private evaluateShowdown() {
    const activePlayers = this.players.filter(p => !p.hasFolded);

    if (activePlayers.length === 1) {
      this.awardPot(activePlayers[0]);
      return;
    }

    const sidePots = this.buildSidePots();
    this.lastHandPots = sidePots;

    const winMessages: string[] = [];
    const allWinnerIds = new Set<string>();

    for (const sidePot of sidePots) {
      if (sidePot.amount <= 0) continue;

      const eligible = activePlayers.filter(p => sidePot.eligibleIds.includes(p.id));
      if (eligible.length === 0) continue;

      // Uncontested — single eligible player wins automatically
      if (eligible.length === 1) {
        eligible[0].chips += sidePot.amount;
        allWinnerIds.add(eligible[0].id);
        winMessages.push(`${eligible[0].username} wins $${sidePot.amount} (uncontested)`);
        continue;
      }

      // Evaluate best hand among eligible players
      const evaluated = eligible.map(p => ({
        player: p,
        result: HandEvaluator.evaluate(p.hand, this.communityCards)
      }));

      evaluated.sort((a, b) => {
        if (b.result.rank !== a.result.rank) return b.result.rank - a.result.rank;
        return b.result.value - a.result.value;
      });

      const top = evaluated[0].result;
      const potWinners = evaluated.filter(
        h => h.result.rank === top.rank && h.result.value === top.value
      );

      const splitAmt = Math.floor(sidePot.amount / potWinners.length);
      // Fix: remainder chips go to the first winner left of dealer (standard poker rule)
      const remainder = sidePot.amount - splitAmt * potWinners.length;

      potWinners.forEach(w => {
        w.player.chips += splitAmt;
        allWinnerIds.add(w.player.id);
      });
      if (remainder > 0) potWinners[0].player.chips += remainder;

      const names = potWinners.map(w => w.player.username).join(' & ');
      const potLabel =
        sidePots.length > 1
          ? sidePot === sidePots[0]
            ? ' (main pot)'
            : ' (side pot)'
          : '';
      winMessages.push(`${names} won $${sidePot.amount}${potLabel} with ${top.name}!`);
    }

    this.winnerIds = Array.from(allWinnerIds);
    this.winMessage = winMessages.join(' · ');
    this.pot = 0;
  }

  private awardPot(winner: Player) {
    this.state = 'showdown';
    this.winnerIds = [winner.id];
    winner.chips += this.pot;
    this.winMessage = `${winner.username} won $${this.pot} (Everyone Folded)`;
    this.pot = 0;
  }

  // ── Settlement Calculation ─────────────────────────────────────────────

  private calculateCurrentInstructions() {
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

  // ── Public State ────────────────────────────────────────────────────────

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
      turnDeadline: this.turnDeadline,
      sidePots: this.lastHandPots,
      players: this.players.map(p =>
        p.getPublicState(this.state === 'showdown' || p.socketId === viewerSocketId)
      )
    };
  }
}
