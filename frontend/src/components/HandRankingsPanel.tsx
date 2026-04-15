'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const SUIT_SYMBOL: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};

interface HandEntry {
  rank: number;
  name: string;
  description: string;
  tip: string;
  example: { r: string; s: string }[];
  rarity: string;
  rarityClass: string;     // tailwind for rarity pill
  badgeClass: string;      // tailwind gradient for rank badge
  borderClass: string;     // tailwind for left accent border
  emoji: string;
}

const HANDS: HandEntry[] = [
  {
    rank: 1,
    name: 'Royal Flush',
    description: 'A · K · Q · J · 10 all of the same suit.',
    tip: 'Unbeatable. Rarest hand in poker.',
    example: [
      { r: 'A', s: 'hearts' }, { r: 'K', s: 'hearts' },
      { r: 'Q', s: 'hearts' }, { r: 'J', s: 'hearts' }, { r: '10', s: 'hearts' },
    ],
    rarity: 'Legendary',
    rarityClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    badgeClass: 'from-yellow-400 to-amber-600',
    borderClass: 'border-yellow-500',
    emoji: '👑',
  },
  {
    rank: 2,
    name: 'Straight Flush',
    description: 'Five consecutive cards, all the same suit.',
    tip: 'Only beaten by a higher straight flush or royal flush.',
    example: [
      { r: '9', s: 'spades' }, { r: '8', s: 'spades' },
      { r: '7', s: 'spades' }, { r: '6', s: 'spades' }, { r: '5', s: 'spades' },
    ],
    rarity: 'Extremely Rare',
    rarityClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    badgeClass: 'from-purple-500 to-violet-700',
    borderClass: 'border-purple-500',
    emoji: '🔥',
  },
  {
    rank: 3,
    name: 'Four of a Kind',
    description: 'Four cards of the same rank, plus any card.',
    tip: 'The kicker (5th card) breaks ties between quads.',
    example: [
      { r: 'A', s: 'spades' }, { r: 'A', s: 'hearts' },
      { r: 'A', s: 'diamonds' }, { r: 'A', s: 'clubs' }, { r: 'K', s: 'spades' },
    ],
    rarity: 'Very Rare',
    rarityClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    badgeClass: 'from-blue-500 to-indigo-700',
    borderClass: 'border-blue-500',
    emoji: '⚡',
  },
  {
    rank: 4,
    name: 'Full House',
    description: 'Three of a kind combined with a pair.',
    tip: 'Ranked by the three-of-a-kind rank first, then the pair.',
    example: [
      { r: 'K', s: 'spades' }, { r: 'K', s: 'hearts' },
      { r: 'K', s: 'diamonds' }, { r: 'Q', s: 'clubs' }, { r: 'Q', s: 'hearts' },
    ],
    rarity: 'Rare',
    rarityClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    badgeClass: 'from-cyan-500 to-teal-700',
    borderClass: 'border-cyan-500',
    emoji: '🏠',
  },
  {
    rank: 5,
    name: 'Flush',
    description: 'Any five cards of the same suit, not in sequence.',
    tip: 'Ranked by highest card. Ace-high flush is the best.',
    example: [
      { r: 'A', s: 'diamonds' }, { r: 'J', s: 'diamonds' },
      { r: '9', s: 'diamonds' }, { r: '6', s: 'diamonds' }, { r: '2', s: 'diamonds' },
    ],
    rarity: 'Uncommon',
    rarityClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    badgeClass: 'from-emerald-500 to-green-700',
    borderClass: 'border-emerald-500',
    emoji: '🌊',
  },
  {
    rank: 6,
    name: 'Straight',
    description: 'Five consecutive cards of mixed suits.',
    tip: 'Ace can be high (A-K-Q-J-10) or low (A-2-3-4-5).',
    example: [
      { r: 'T', s: 'hearts' }, { r: '9', s: 'spades' },
      { r: '8', s: 'diamonds' }, { r: '7', s: 'clubs' }, { r: '6', s: 'hearts' },
    ],
    rarity: 'Uncommon',
    rarityClass: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
    badgeClass: 'from-lime-400 to-yellow-500',
    borderClass: 'border-lime-500',
    emoji: '📈',
  },
  {
    rank: 7,
    name: 'Three of a Kind',
    description: 'Three cards of the same rank, plus two unrelated cards.',
    tip: 'Also known as "trips" or a "set" when using a pocket pair.',
    example: [
      { r: 'Q', s: 'spades' }, { r: 'Q', s: 'hearts' },
      { r: 'Q', s: 'diamonds' }, { r: 'K', s: 'clubs' }, { r: '9', s: 'spades' },
    ],
    rarity: 'Semi-Common',
    rarityClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    badgeClass: 'from-orange-400 to-red-600',
    borderClass: 'border-orange-500',
    emoji: '🎯',
  },
  {
    rank: 8,
    name: 'Two Pair',
    description: 'Two different pairs, plus one unrelated card.',
    tip: 'Ranked by highest pair, then second pair, then kicker.',
    example: [
      { r: 'A', s: 'spades' }, { r: 'A', s: 'hearts' },
      { r: 'K', s: 'diamonds' }, { r: 'K', s: 'clubs' }, { r: 'Q', s: 'spades' },
    ],
    rarity: 'Common',
    rarityClass: 'bg-stone-500/20 text-stone-300 border-stone-600/30',
    badgeClass: 'from-stone-500 to-zinc-700',
    borderClass: 'border-stone-500',
    emoji: '✌️',
  },
  {
    rank: 9,
    name: 'One Pair',
    description: 'Two cards of the same rank, plus three unrelated cards.',
    tip: 'The three kicker cards rank pairs of equal rank.',
    example: [
      { r: 'A', s: 'spades' }, { r: 'A', s: 'hearts' },
      { r: 'K', s: 'diamonds' }, { r: 'Q', s: 'clubs' }, { r: 'J', s: 'spades' },
    ],
    rarity: 'Very Common',
    rarityClass: 'bg-stone-600/20 text-stone-400 border-stone-700/30',
    badgeClass: 'from-stone-600 to-zinc-800',
    borderClass: 'border-stone-600',
    emoji: '🤝',
  },
  {
    rank: 10,
    name: 'High Card',
    description: 'No matching cards — just the highest card in your hand.',
    tip: 'If no one has any combination, the highest card wins.',
    example: [
      { r: 'A', s: 'spades' }, { r: 'Q', s: 'hearts' },
      { r: '9', s: 'diamonds' }, { r: '7', s: 'clubs' }, { r: '2', s: 'hearts' },
    ],
    rarity: 'Most Common',
    rarityClass: 'bg-zinc-700/30 text-zinc-500 border-zinc-700/30',
    badgeClass: 'from-zinc-700 to-stone-900',
    borderClass: 'border-zinc-700',
    emoji: '🃏',
  },
];

// ── Mini Card ─────────────────────────────────────────────────────────────────

const MiniCard = ({ r, s }: { r: string; s: string }) => {
  const isRed = s === 'hearts' || s === 'diamonds';
  const sym = SUIT_SYMBOL[s] || s;
  const display = r === 'T' ? '10' : r;
  return (
    <div
      className={`
        w-[26px] h-[38px] rounded-md bg-white border border-stone-200
        flex flex-col items-center justify-between py-[3px] px-[2px]
        select-none shadow-md flex-shrink-0
        ${isRed ? 'text-red-600' : 'text-stone-900'}
      `}
    >
      <span className="text-[7px] font-black leading-none">{display}</span>
      <span className="text-[11px] leading-none">{sym}</span>
      <span className="text-[7px] font-black leading-none rotate-180">{display}</span>
    </div>
  );
};

// ── Hand Card Row ─────────────────────────────────────────────────────────────

const HandCard = ({ hand, index }: { hand: HandEntry; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.045, type: 'spring', stiffness: 280, damping: 26 }}
    className={`
      relative flex flex-col gap-2 p-3 rounded-2xl
      bg-stone-800/40 border border-stone-800/80
      border-l-[3px] ${hand.borderClass}
      hover:bg-stone-800/70 transition-colors duration-150
    `}
  >
    {/* Top row: rank badge + name + rarity */}
    <div className="flex items-center gap-2.5 min-w-0">
      {/* Rank badge */}
      <div
        className={`
          flex-none w-7 h-7 rounded-lg
          bg-gradient-to-br ${hand.badgeClass}
          flex items-center justify-center
          text-white font-black text-xs shadow-lg
        `}
      >
        {hand.rank}
      </div>

      {/* Name + emoji */}
      <div className="min-w-0 flex-1">
        <p className="text-white font-black text-sm leading-none truncate">
          {hand.emoji} {hand.name}
        </p>
      </div>

      {/* Rarity pill */}
      <span
        className={`
          flex-none text-[9px] font-bold px-1.5 py-0.5 rounded-full
          border ${hand.rarityClass}
          uppercase tracking-wide whitespace-nowrap
        `}
      >
        {hand.rarity}
      </span>
    </div>

    {/* Mini cards */}
    <div className="flex items-center gap-1 pl-0.5">
      {hand.example.map((card, i) => (
        <MiniCard key={i} r={card.r} s={card.s} />
      ))}
    </div>

    {/* Description */}
    <p className="text-stone-400 text-[11px] leading-relaxed pl-0.5">
      {hand.description}
    </p>

    {/* Tip */}
    <p className="text-stone-600 text-[10px] italic leading-snug pl-0.5">
      💡 {hand.tip}
    </p>
  </motion.div>
);

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HandRankingsPanel = ({ isOpen, onClose }: Props) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer — slides in from the right on all screen sizes */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={e => e.stopPropagation()}
            className="
              fixed right-0 top-0 bottom-0 z-[111]
              w-full sm:w-[400px]
              bg-[#111113] border-l border-stone-800/80
              flex flex-col shadow-2xl
            "
          >
            {/* ── Fixed Header ── */}
            <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-[#111113]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/10 rounded-xl">
                  <BookOpen className="text-emerald-400" size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight">
                    Hand Rankings
                  </h2>
                  <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">
                    Best → Worst · Texas Hold'em
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-stone-800 rounded-full text-stone-500 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Scrollable Rankings ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 space-y-2 p-3">
              {HANDS.map((hand, i) => (
                <HandCard key={hand.rank} hand={hand} index={i} />
              ))}

              {/* Bottom breathing room */}
              <div className="h-2" />
            </div>

            {/* ── Fixed Footer ── */}
            <div className="flex-none px-4 py-2.5 border-t border-stone-800 bg-stone-950/60 text-[9px] text-stone-600 font-bold uppercase tracking-widest">
              <div className="flex justify-between">
                <span>Best 5 cards from 7 win the pot</span>
                <span>Rank 1 = Strongest</span>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
