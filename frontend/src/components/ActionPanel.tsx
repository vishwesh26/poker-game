import React, { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { chipsToRupees } from '@/utils/currency';

interface ActionPanelProps {
  roomId: string;
  canAct: boolean;
  currentHighestBet: number;
  lastRaiseAmount: number;
  playerBet: number;
  playerChips: number;
  gameType?: 'FAKE' | 'REAL';
  entryAmount?: number;
  isMobile?: boolean;
  turnDeadline?: number; // epoch ms when the current turn expires
}

// ── Turn Countdown Ring ───────────────────────────────────────────────────────
const TurnTimer = ({ deadline, urgent }: { deadline: number; urgent: boolean }) => {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  );

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);

  const TOTAL = 30;
  const r = 14;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(1, secondsLeft / TOTAL);
  const dashOffset = circumference * (1 - fraction);
  const isUrgent = secondsLeft <= 10;
  const color = isUrgent ? '#ef4444' : '#10b981';

  return (
    <div className="flex items-center gap-1 flex-none">
      <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90 flex-none">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#292524" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.5s' }}
        />
      </svg>
      <span
        className={`text-xs font-mono font-black tabular-nums min-w-[22px] ${
          isUrgent ? 'text-red-400 animate-pulse' : 'text-stone-400'
        }`}
      >
        {secondsLeft}s
      </span>
    </div>
  );
};

export const ActionPanel = ({
  roomId, canAct, currentHighestBet, lastRaiseAmount,
  playerBet, playerChips, gameType, entryAmount, isMobile = false,
  turnDeadline = 0
}: ActionPanelProps) => {
  const { socket } = useSocket();
  const callAmount = Math.min(currentHighestBet - playerBet, playerChips);
  const minRaise = currentHighestBet + (lastRaiseAmount || 20);
  const [raiseVal, setRaiseVal] = useState(Math.min(minRaise, playerChips + playerBet));

  useEffect(() => {
    const nextMin = currentHighestBet + (lastRaiseAmount || 20);
    setRaiseVal(Math.min(nextMin, playerChips + playerBet));
  }, [currentHighestBet, lastRaiseAmount, playerChips, playerBet]);

  const emit = useCallback((action: string, amount?: number) => {
    socket?.emit('action', { roomId, action, amount });
  }, [socket, roomId]);

  const isAllIn = raiseVal >= playerChips + playerBet;
  const showTimer = turnDeadline > 0;

  // ── Waiting state ──────────────────────────────────────────────────────────
  if (!canAct) {
    return (
      <div className={`w-full flex flex-col items-center justify-center gap-3 bg-stone-950/90 border-t border-stone-800 
        ${isMobile ? 'h-[94px]' : 'py-3'}`}>
        <div className="flex items-center gap-3">
          <span className="text-stone-600 font-bold uppercase tracking-widest text-[10px] md:text-xs">
            Waiting for turn…
          </span>
          {showTimer && <TurnTimer deadline={turnDeadline} urgent={false} />}
        </div>
      </div>
    );
  }

  // ── Mobile Layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="w-full h-[94px] bg-stone-950/95 border-t border-stone-800/80 px-2 pt-2 flex flex-col justify-between pb-2 safe-area-bottom">
        {/* Timer + Slider row */}
        <div className="flex items-center gap-2 px-1">
          {showTimer && <TurnTimer deadline={turnDeadline} urgent />}
          <span className="text-stone-500 text-[9px] font-bold uppercase tracking-wider flex-none">Raise</span>
          <input
            type="range"
            min={Math.min(minRaise, playerChips + playerBet)}
            max={playerChips + playerBet}
            step={10}
            value={raiseVal}
            onChange={e => setRaiseVal(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
            style={{ height: 4 }}
          />
          <span className="text-emerald-400 font-mono text-[10px] font-bold flex-none">
            ${raiseVal}
          </span>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* FOLD */}
          <button
            onClick={() => emit('fold')}
            className="py-2.5 rounded-xl font-black text-xs uppercase bg-rose-950/40 text-rose-400 border border-rose-800/60 active:bg-rose-600 active:text-white transition-colors"
          >
            Fold
          </button>

          {/* CHECK / CALL */}
          {callAmount === 0 ? (
            <button
              onClick={() => emit('check')}
              className="py-2.5 rounded-xl font-black text-xs uppercase bg-stone-800/60 text-white border border-stone-700/60 active:bg-sky-600 transition-colors"
            >
              Check
            </button>
          ) : (
            <button
              onClick={() => emit('call')}
              className="py-2.5 rounded-xl font-black text-[11px] uppercase bg-blue-950/50 text-blue-300 border border-blue-800/60 active:bg-blue-600 active:text-white transition-colors flex flex-col items-center gap-0"
            >
              <span>Call</span>
              <span className="text-[9px] font-mono text-blue-400/80">${callAmount}</span>
            </button>
          )}

          {/* RAISE / ALL-IN */}
          <button
            onClick={() => emit('raise', raiseVal)}
            className={`py-2.5 rounded-xl font-black text-[11px] uppercase flex flex-col items-center gap-0 transition-colors border
              ${isAllIn
                ? 'bg-purple-950/50 text-purple-300 border-purple-800/60 active:bg-purple-600'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60 active:bg-emerald-600'
              } active:text-white`}
          >
            <span>{isAllIn ? '⚡ All-In' : 'Raise'}</span>
            {!isAllIn && <span className="text-[9px] font-mono text-emerald-400/80">${raiseVal}</span>}
          </button>
        </div>
      </div>
    );
  }

  // ── Desktop Layout ─────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-stone-950/95 border-t border-stone-800/80 px-6 py-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        {/* Raise slider + timer */}
        <div className="flex items-center gap-4 bg-stone-900/60 rounded-2xl px-4 py-2 border border-stone-800/60">
          <span className="text-stone-500 text-xs font-bold uppercase tracking-widest flex-none">
            Raise amount
          </span>
          <input
            type="range"
            min={Math.min(minRaise, playerChips + playerBet)}
            max={playerChips + playerBet}
            step={10}
            value={raiseVal}
            onChange={e => setRaiseVal(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <div className="flex-none text-right">
            <span className="text-emerald-400 font-mono font-bold text-sm">
              ${raiseVal.toLocaleString()}
            </span>
            {gameType === 'REAL' && (
              <p className="text-emerald-400/50 text-[10px] font-medium">
                {chipsToRupees(raiseVal, entryAmount || 0)}
              </p>
            )}
          </div>
          {/* Turn countdown ring — visible to the active player */}
          {showTimer && <TurnTimer deadline={turnDeadline} urgent />}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => emit('fold')}
            className="py-3.5 rounded-2xl font-black text-sm uppercase bg-rose-950/40 text-rose-400 border border-rose-800/50 hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all duration-200"
          >
            Fold
          </button>

          {callAmount === 0 ? (
            <button
              onClick={() => emit('check')}
              className="py-3.5 rounded-2xl font-black text-sm uppercase bg-stone-800/60 text-white border border-stone-700 hover:bg-sky-600 hover:border-sky-500 hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all duration-200"
            >
              Check
            </button>
          ) : (
            <button
              onClick={() => emit('call')}
              className="py-3.5 rounded-2xl font-black text-sm uppercase bg-blue-950/50 text-blue-300 border border-blue-800/50 hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-200 flex flex-col items-center gap-0.5"
            >
              <span>Call ${callAmount}</span>
              {gameType === 'REAL' && (
                <span className="text-[10px] font-medium opacity-70 normal-case">
                  {chipsToRupees(callAmount, entryAmount || 0)}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => emit('raise', raiseVal)}
            className={`py-3.5 rounded-2xl font-black text-sm uppercase flex flex-col items-center gap-0.5 border transition-all duration-200
              ${isAllIn
                ? 'bg-purple-950/50 text-purple-300 border-purple-800/50 hover:bg-purple-600 hover:text-white hover:shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50 hover:bg-emerald-600 hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              }`}
          >
            <span>{isAllIn ? '⚡ All-In' : `Raise $${raiseVal.toLocaleString()}`}</span>
            {gameType === 'REAL' && !isAllIn && (
              <span className="text-[10px] font-medium opacity-70 normal-case">
                {chipsToRupees(raiseVal, entryAmount || 0)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
