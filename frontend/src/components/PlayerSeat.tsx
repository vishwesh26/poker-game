/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayingCard } from './PlayingCard';
import { chipsToRupees } from '@/utils/currency';

interface PlayerSeatProps {
  isCurrentTurn: boolean;
  isDealer: boolean;
  isWinner: boolean;
  revealAllCards: boolean;
  gameType?: 'FAKE' | 'REAL';
  entryAmount?: number;
  isMobile?: boolean;
}

// ── Action bubble ──────────────────────────────────────────────────────────
const ActionTag = ({ action }: { action: string }) => {
  const [visible, setVisible] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!action) return;
    setVisible(action);
    const t = setTimeout(() => setVisible(null), 2500);
    return () => clearTimeout(t);
  }, [action]);

  if (!visible) return null;

  const colour =
    visible.toLowerCase().includes('fold')  ? 'bg-rose-600'    :
    visible.toLowerCase().includes('raise') ? 'bg-amber-500 text-stone-900' :
    visible.toLowerCase().includes('all')   ? 'bg-purple-600'  :
    'bg-sky-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.7 }}
      animate={{ opacity: 1, y: -36, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      className={`absolute left-1/2 -translate-x-1/2 top-0 z-50 ${colour} text-white text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none shadow-lg`}
    >
      {visible}
    </motion.div>
  );
};

// ── Empty seat ─────────────────────────────────────────────────────────────
const EmptySeat = ({ isMobile }: { isMobile: boolean }) => (
  <div
    className={`rounded-full border border-dashed border-stone-800/60 bg-stone-900/20 flex items-center justify-center
      ${isMobile ? 'w-9 h-9' : 'w-14 h-14'}`}
  />
);

// ── Player Seat (circular design) ─────────────────────────────────────────
export const PlayerSeat = ({
  player, isCurrentTurn, isDealer, isWinner, revealAllCards,
  gameType, entryAmount, isMobile = false
}: PlayerSeatProps) => {

  if (!player) return <EmptySeat isMobile={isMobile} />;

  const hasFolded = player.hasFolded && !revealAllCards;

  // Sizes
  const circleSize  = isMobile ? 'w-11 h-11' : 'w-[60px] h-[60px]';
  const imgSize     = isMobile ? 'w-9 h-9'   : 'w-[52px] h-[52px]';
  const nameSize    = isMobile ? 'text-[8px] max-w-[44px]' : 'text-[10px] max-w-[64px]';
  const chipsSize   = isMobile ? 'text-[8px]' : 'text-[10px] md:text-xs';
  const cardGap     = isMobile ? 'gap-0.5'    : 'gap-1';
  const cardOffset  = isMobile ? 'mb-[-6px]'  : 'mb-[-8px]';

  // Glow colour based on state
  const ringColour =
    isWinner       ? 'ring-yellow-400 ring-[2.5px] shadow-[0_0_16px_rgba(250,204,21,0.5)]' :
    isCurrentTurn  ? 'ring-emerald-400 ring-[2.5px] shadow-[0_0_16px_rgba(16,185,129,0.5)]' :
    hasFolded      ? 'ring-stone-800 ring-1 opacity-40' :
    'ring-stone-700 ring-1';

  return (
    <div className={`relative flex flex-col items-center transition-all duration-200 ${isCurrentTurn ? 'scale-105' : 'scale-100'}`}>

      {/* ── Cards fan (sits above the circle) ── */}
      <div className={`flex items-end justify-center ${cardGap} ${cardOffset} z-10 relative`}>
        <AnimatePresence>
          {player.hand?.map((card: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: hasFolded ? 0.2 : 1 }}
              transition={{ delay: idx * 0.12, type: 'spring', stiffness: 300, damping: 24 }}
              className={idx === 0 ? '-rotate-6' : 'rotate-6'}
            >
              <PlayingCard
                rank={card.rank}
                suit={card.suit}
                isHidden={card.rank === '?'}
                revealAllCards={revealAllCards}
                delay={0}
                size={isMobile ? 'sm' : 'md'}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Circular avatar frame ── */}
      <div className={`relative rounded-full ring z-20 ${ circleSize} ${ringColour} overflow-hidden bg-stone-900 flex-shrink-0`}>
        <img
          src={player.avatarUrl}
          alt={player.username}
          className={`${imgSize} rounded-full object-cover`}
        />

        {/* Folded dim overlay */}
        {hasFolded && (
          <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
            <span className="text-rose-500 font-black text-[7px] uppercase tracking-widest -rotate-12">Out</span>
          </div>
        )}
      </div>

      {/* ── Dealer badge ── */}
      {isDealer && (
        <div className={`absolute z-30 bg-white text-stone-900 rounded-full font-black border-2 border-stone-300 shadow
          flex items-center justify-center
          ${isMobile ? 'w-3.5 h-3.5 text-[6px] -top-0.5 -right-0.5' : 'w-5 h-5 text-[8px] -top-1 -right-1'}`}>
          D
        </div>
      )}

      {/* ── Winner crown ── */}
      {isWinner && (
        <motion.span
          initial={{ y: 0, scale: 0 }}
          animate={{ y: isMobile ? -22 : -28, scale: 1 }}
          className={`absolute left-1/2 -translate-x-1/2 top-0 z-40 ${isMobile ? 'text-sm' : 'text-xl'} pointer-events-none`}
        >
          👑
        </motion.span>
      )}

      {/* ── Bet chip (floats above avatar) ── */}
      {player.currentBet > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`absolute left-1/2 -translate-x-1/2 z-30
            bg-stone-950 border border-amber-500/60 text-amber-400 font-mono font-bold rounded-full whitespace-nowrap
            ${isMobile ? 'text-[7px] px-1.5 py-0' : 'text-[9px] px-2 py-0.5'}
          `}
          style={{ top: isMobile ? -14 : -18 }}
        >
          ${player.currentBet}
        </motion.div>
      )}

      {/* ── Action bubble ── */}
      <AnimatePresence>
        <ActionTag action={player.lastAction} />
      </AnimatePresence>

      {/* ── Name + chips (below the circle) ── */}
      <div className="flex flex-col items-center mt-0.5 z-20">
        <span className={`font-bold text-white truncate text-center leading-none ${nameSize}`}>
          {player.username}
        </span>
        <span className={`font-mono font-bold text-emerald-400 leading-none ${chipsSize}`}>
          ${player.chips.toLocaleString()}
        </span>
        {gameType === 'REAL' && (
          <span className={`text-emerald-400/40 font-bold leading-none ${isMobile ? 'text-[6px]' : 'text-[8px]'}`}>
            {chipsToRupees(player.chips, entryAmount || 0)}
          </span>
        )}
      </div>
    </div>
  );
};
