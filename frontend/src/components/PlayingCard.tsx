import { motion } from 'framer-motion';

interface PlayingCardProps {
  rank: string;
  suit: string;
  isHidden?: boolean;
  revealAllCards?: boolean;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
};

const SIZE_CLASSES = {
  sm:  'w-7 h-[42px]   rounded-md   text-[9px]  md:text-[10px]',
  md:  'w-10 h-14      rounded-lg   text-[11px] md:text-xs',
  lg:  'w-14 h-20      rounded-xl   text-sm     md:text-base',
};

export const PlayingCard = ({
  rank, suit, isHidden = false, revealAllCards = false, delay = 0, size = 'sm'
}: PlayingCardProps) => {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const symbol = SUIT_SYMBOLS[suit] || suit;
  const sizeClass = SIZE_CLASSES[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: -30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 22 }}
      className={`${sizeClass} bg-white border border-stone-200 shadow-xl relative overflow-hidden flex-shrink-0 font-bold select-none ${isRed ? 'text-red-600' : 'text-stone-900'}`}
    >
      {isHidden ? (
        // Card back
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-stone-900 to-indigo-950 flex items-center justify-center">
          <div className="absolute inset-[3px] rounded border border-indigo-700/40" />
          <span className="text-indigo-400/60 text-xs md:text-base font-black">♠</span>
        </div>
      ) : (
        <>
          <div className="absolute top-0.5 left-0.5 flex flex-col items-center leading-none">
            <span className="font-black text-[9px] md:text-[11px]">{rank}</span>
            <span className="text-[8px] md:text-[10px]">{symbol}</span>
          </div>
          <div className="absolute bottom-0.5 right-0.5 flex flex-col items-center leading-none rotate-180">
            <span className="font-black text-[9px] md:text-[11px]">{rank}</span>
            <span className="text-[8px] md:text-[10px]">{symbol}</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base md:text-2xl opacity-80">{symbol}</span>
          </div>
        </>
      )}
    </motion.div>
  );
};
