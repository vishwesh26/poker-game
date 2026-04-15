import { BaseGame } from './BaseGame';
import { Player } from './Player';
import { PokerGame } from './PokerGame';
import { HandEvaluator, HandRank } from './HandEvaluator';

export class BotIntelligence {
  public static determineAction(game: BaseGame, player: Player): { action: string; amount?: number } {
    if (game.gameName === 'POKER') {
      return this.pokerLogic(game as PokerGame, player);
    }
    return { action: 'fold' };
  }

  private static pokerLogic(game: PokerGame, player: Player): { action: string; amount?: number } {
    const callAmount = game.currentHighestBet - player.currentBet;
    const canCheck = callAmount === 0;

    // Preflop logic
    if (game.state === 'preflop') {
      const v1 = player.hand[0].getValue();
      const v2 = player.hand[1].getValue();
      const isPair = v1 === v2;
      const isHigh = v1 >= 10 || v2 >= 10;
      const isSuited = player.hand[0].suit === player.hand[1].suit;

      // Tight-aggressive starting range
      if (isPair || (isHigh && isSuited) || (v1 + v2 >= 20)) {
        if (Math.random() < 0.2 && player.chips >= game.currentHighestBet + game.lastRaiseAmount) {
          return { action: 'raise', amount: game.currentHighestBet + game.lastRaiseAmount };
        }
        return { action: 'call' };
      }

      // Random bluff or late position call
      if (Math.random() < 0.1) return { action: 'call' };
      
      return canCheck ? { action: 'check' } : { action: 'fold' };
    }

    // Postflop logic (Flop, Turn, River)
    const result = HandEvaluator.evaluate(player.hand, game.communityCards);
    const score = result.rank;

    // Strong hands (Three of a Kind or better)
    if (score >= HandRank.ThreeOfAKind) {
       if (Math.random() < 0.4 && player.chips >= game.currentHighestBet + game.lastRaiseAmount) {
         return { action: 'raise', amount: game.currentHighestBet + game.lastRaiseAmount };
       }
       return canCheck ? { action: 'check' } : { action: 'call' };
    }

    // Moderate hands (Pair, Two Pair)
    if (score >= HandRank.Pair) {
       // If it's a high pair, call. If weak pair, maybe fold if bet is high.
       if (callAmount > player.chips * 0.3 && score === HandRank.Pair && Math.random() < 0.5) {
         return { action: 'fold' };
       }
       return canCheck ? { action: 'check' } : { action: 'call' };
    }

    // Weak hands (High Card)
    if (canCheck) return { action: 'check' };
    
    // Rare bluff
    if (Math.random() < 0.05) return { action: 'call' };

    return { action: 'fold' };
  }
}
