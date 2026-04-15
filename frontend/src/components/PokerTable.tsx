/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState } from 'react';
import { PlayerSeat } from './PlayerSeat';
import { PlayingCard } from './PlayingCard';
import { ActionPanel } from './ActionPanel';
import { useSocket } from '@/context/SocketContext';
import { LogOut, History, Maximize2, Users, Play, BookOpen } from 'lucide-react';
import { chipsToRupees } from '@/utils/currency';
import { SettlementModal } from './SettlementModal';
import { HandRankingsPanel } from './HandRankingsPanel';
import { useRouter } from 'next/navigation';

/*
  Seat layout — players sit OUTSIDE the rectangular table.
  All positions are absolute within the arena container.

  Desktop (6 seats):          Mobile (6 seats):
    [3]   [4]   [5]             [3]  [4]  [5]
  [2]  ┌────────┐  [6]       [2] ┌──────┐ [6]
       │ Table  │               │Table │
  [1]  └────────┘ (empty)    [1] └──────┘ (same)
         [Hero]                    [Hero]
*/

// 6 seat positions as CSSProperties.
// Index 0 = Hero (bottom-center), 1-5 = opponents going counter-clockwise.
const buildPositions = (mobile: boolean): React.CSSProperties[] => {
  if (mobile) {
    return [
      // Hero — bottom center
      { bottom: 2, left: '50%', transform: 'translateX(-50%)' },
      // Bottom-left (moved inward slightly)
      { bottom: '18%', left: 2 },
      // Top-left (moved inward slightly)
      { top: '18%', left: 2 },
      // Top-center — pushed down so cards are always visible
      { top: '6%', left: '50%', transform: 'translateX(-50%)' },
      // Top-right (closer to table)
      { top: '18%', right: '10%' },
      // Bottom-right (closer to table)
      { bottom: '18%', right: '10%' },
    ];
  }
  return [
    // Hero — bottom center
    { bottom: 8, left: '50%', transform: 'translateX(-50%)' },
    // Bottom-left
    { bottom: '16%', left: 16 },
    // Top-left
    { top: '16%', left: 16 },
    // Top-center (direct opponent)
    { top: 8, left: '50%', transform: 'translateX(-50%)' },
    // Top-right
    { top: '16%', right: 16 },
    // Bottom-right
    { bottom: '16%', right: 16 },
  ];
};

export const PokerTable = ({ gameState, roomId }: { gameState: any; roomId: string }) => {
  const { socket } = useSocket();
  const router = useRouter();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('poker_userid') : null;
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLeave = () => {
    if (window.confirm('Leave the match?')) {
      socket?.emit('leave_room', { roomId });
      router.push('/');
    }
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };

  // Rotate so Hero is always index 0
  const heroIdx = gameState.players.findIndex((p: any) => p.id === userId);
  const seatedPlayers: (any | null)[] = Array(6).fill(null);
  gameState.players.forEach((p: any, i: number) => {
    const slot = heroIdx === -1 ? i : (i - heroIdx + gameState.players.length) % gameState.players.length;
    if (slot < 6) seatedPlayers[slot] = p;
  });

  const heroPlayer = gameState.players.find((p: any) => p.id === userId);
  const isHeroTurn =
    gameState.players[gameState.currentTurnIndex]?.id === userId &&
    gameState.state !== 'waiting' &&
    gameState.state !== 'showdown';

  const positions = buildPositions(isMobile);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0d0f]">

      {/* ═══ HEADER ══════════════════════════════════════ */}
      <header className={`flex-none flex items-center justify-between border-b border-stone-900/80 bg-[#0d0d0f]
        ${isMobile ? 'px-2 py-1.5' : 'px-5 py-2'}`}>

        <div className="flex items-center gap-2">
          {/* Room pill */}
          <div className={`bg-stone-900 border border-stone-800 rounded-xl flex flex-col leading-none
            ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
            <span className="text-stone-600 font-mono text-[8px] uppercase tracking-widest">Room</span>
            <span className={`text-emerald-400 font-black leading-none ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {roomId}
            </span>
          </div>
          {gameState.gameType === 'REAL' && (
            <span className={`bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-bold rounded-lg uppercase tracking-widest
              ${isMobile ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-3 py-1.5'}`}>
              ₹{gameState.entryAmount}
            </span>
          )}
        </div>

        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
          {[
          { icon: <Maximize2 size={isMobile ? 12 : 14} />, onClick: toggleFullscreen, label: null, style: 'text-stone-500 hover:text-sky-400' },
            { icon: <BookOpen size={isMobile ? 12 : 14} />, onClick: () => setIsRankingsOpen(true), label: 'Guide', style: 'text-stone-500 hover:text-emerald-400' },
            { icon: <History size={isMobile ? 12 : 14} />, onClick: () => setIsSettlementOpen(true), label: 'History', style: 'text-stone-500 hover:text-emerald-400' },
            { icon: <LogOut size={isMobile ? 12 : 14} />, onClick: handleLeave, label: 'Leave', style: 'text-rose-600/80 hover:text-white hover:bg-rose-600' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.onClick}
              className={`bg-stone-900 border border-stone-800 rounded-lg transition-colors ${btn.style}
                ${isMobile ? 'p-1.5' : 'px-3 py-1.5 flex items-center gap-1.5'}`}>
              {btn.icon}
              {!isMobile && btn.label && <span className="text-[10px] font-bold uppercase tracking-wider">{btn.label}</span>}
            </button>
          ))}
        </div>
      </header>

      <SettlementModal
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        settlements={gameState.settlements || []}
        instructions={gameState.instructions || []}
        entryAmount={gameState.entryAmount}
        gameType={gameState.gameType}
      />

      <HandRankingsPanel
        isOpen={isRankingsOpen}
        onClose={() => setIsRankingsOpen(false)}
      />

      {/* ═══ ARENA ══════════════════════════════════════ */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">

        {/* ── RECTANGULAR FELT TABLE ───────────────────── */}
        <div
          className="relative flex flex-col items-center justify-center z-10 rounded-3xl"
          style={{
            width:  isMobile ? '56%' : '58%',
            height: isMobile ? '50%' : '58%',
            minWidth:  isMobile ? 180 : 380,
            minHeight: isMobile ? 110 : 240,
            background: 'linear-gradient(160deg, #16653a 0%, #155e34 50%, #14532d 100%)',
            border: isMobile ? '4px solid #7c3b0a' : '10px solid #7c3b0a',
            boxShadow: '0 8px 40px rgba(0,0,0,0.8), inset 0 2px 20px rgba(0,0,0,0.25)',
          }}
        >
          {/* Felt inner border */}
          <div className="absolute rounded-2xl border border-emerald-700/20 pointer-events-none"
            style={{ inset: isMobile ? 4 : 8 }} />

          {/* Pot — main pot or multiple side pots */}
          {gameState.pot > 0 && (
            <div className={`flex items-center gap-1.5 bg-black/50 border border-stone-600/50 rounded-full backdrop-blur-sm
              ${isMobile ? 'px-2 py-0.5 mb-1' : 'px-4 py-1.5 mb-3'}`}>
              <div className={`rounded-full bg-emerald-400 ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
              <span className={`text-emerald-400 font-mono font-bold ${isMobile ? 'text-[10px]' : 'text-base'}`}>
                ${gameState.pot.toLocaleString()}
              </span>
              {gameState.gameType === 'REAL' && !isMobile && (
                <span className="text-emerald-400/40 text-[10px] font-bold">
                  ({chipsToRupees(gameState.pot, gameState.entryAmount)})
                </span>
              )}
            </div>
          )}

          {/* Side pot breakdown (shown when there are multiple pots) */}
          {!isMobile && gameState.sidePots && gameState.sidePots.length > 1 && (
            <div className="flex gap-1 mb-1">
              {gameState.sidePots.map((sp: any, i: number) => (
                <span key={i} className="text-[8px] text-stone-400 font-mono bg-black/40 px-1.5 py-0.5 rounded-full border border-stone-700/40">
                  {i === 0 ? 'main' : 'side'} ${sp.amount}
                </span>
              ))}
            </div>
          )}

          {/* Community cards */}
          <div className={`flex z-10 justify-center ${isMobile ? 'gap-0.5' : 'gap-2'}`}>
            {gameState.communityCards?.map((card: any, idx: number) => (
              <PlayingCard key={idx} rank={card.rank} suit={card.suit}
                revealAllCards={false} delay={idx * 0.08}
                size={isMobile ? 'sm' : 'lg'} />
            ))}
          </div>

          {/* Waiting overlay */}
          {gameState.state === 'waiting' && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center gap-2 px-4 z-30">
              <p className={`font-bold text-white tracking-widest ${isMobile ? 'text-[10px]' : 'text-sm'}`}>
                {gameState.players.length} / {gameState.maxPlayers || 6} Players
              </p>
              {gameState.players.length >= 2 ? (
                <button onClick={() => socket?.emit('start_game', { roomId })}
                  className={`bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-black flex items-center gap-1 transition
                    ${isMobile ? 'px-3 py-1 text-[10px]' : 'px-6 py-2 text-sm'}`}>
                  <Play size={isMobile ? 10 : 14} fill="currentColor" /> START
                </button>
              ) : (
                <span className={`text-stone-400 font-bold bg-stone-900/80 border border-stone-700 rounded-full flex items-center gap-1
                  ${isMobile ? 'px-2.5 py-1 text-[9px]' : 'px-5 py-2 text-xs'}`}>
                  <Users size={isMobile ? 9 : 12} /> Waiting…
                </span>
              )}
            </div>
          )}

          {/* Winner banner */}
          {gameState.state === 'showdown' && gameState.winMessage && (
            <div className="absolute inset-x-0 flex justify-center" style={{ top: isMobile ? -28 : -48 }}>
              <div className={`animate-bounce bg-amber-500 text-stone-950 rounded-full font-black border-2 border-yellow-300 whitespace-nowrap shadow-[0_0_30px_rgba(245,158,11,0.6)]
                ${isMobile ? 'text-[9px] px-3 py-0.5' : 'text-base px-6 py-2'}`}>
                🏆 {gameState.winMessage}
              </div>
            </div>
          )}
        </div>

        {/* ── PLAYER SEATS (all positioned in the arena, NOT inside the table) ── */}
        {positions.map((pos, idx) => {
          const p = seatedPlayers[idx];
          return (
            <div key={idx} className="absolute z-20" style={pos}>
              <PlayerSeat
                player={p}
                isCurrentTurn={!!p && gameState.state !== 'waiting' && gameState.players[gameState.currentTurnIndex]?.id === p.id}
                isDealer={!!p && gameState.players[gameState.dealerIndex]?.id === p.id}
                isWinner={!!p && !!gameState.winnerIds?.includes(p.id)}
                revealAllCards={gameState.state === 'showdown'}
                gameType={gameState.gameType}
                entryAmount={gameState.entryAmount}
                isMobile={isMobile}
              />
            </div>
          );
        })}
      </div>

      {/* ═══ ACTION PANEL ══════════════════════════════ */}
      {heroPlayer && gameState.state !== 'waiting' && (
        <div className="flex-none z-50">
          <ActionPanel
            roomId={roomId}
            canAct={isHeroTurn}
            currentHighestBet={gameState.currentHighestBet}
            lastRaiseAmount={gameState.lastRaiseAmount}
            playerBet={heroPlayer.currentBet}
            playerChips={heroPlayer.chips}
            gameType={gameState.gameType}
            entryAmount={gameState.entryAmount}
            isMobile={isMobile}
            turnDeadline={gameState.turnDeadline || 0}
          />
        </div>
      )}
    </div>
  );
};
