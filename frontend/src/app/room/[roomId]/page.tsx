"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { PokerTable } from '@/components/PokerTable';

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket || !isConnected) return;

    const storedName = localStorage.getItem('poker_username') || 'Guest';
    const userId = localStorage.getItem('poker_userid') || Math.random().toString(36).substring(2, 9);
    localStorage.setItem('poker_userid', userId);

    socket.emit('join_room', {
      roomId,
      userId,
      username: storedName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${storedName}`,
      gameType: searchParams.get('mode') || 'FAKE',
      gameName: 'POKER',
      entryAmount: parseInt(searchParams.get('entry') || '0')
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('error', (err) => {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('game_state');
      socket.off('error');
    };
  }, [socket, isConnected, roomId, searchParams]);

  if (!gameState) {
    return (
      <div className="h-screen bg-stone-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-stone-500 font-bold animate-pulse uppercase tracking-widest text-xs">Entering arena…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-stone-950 overflow-hidden select-none">
      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] bg-red-600/90 text-white px-5 py-2 rounded-full font-bold shadow-2xl border border-red-500 animate-bounce text-sm whitespace-nowrap">
          {error}
        </div>
      )}
      <PokerTable gameState={gameState} roomId={roomId} />
    </div>
  );
}
