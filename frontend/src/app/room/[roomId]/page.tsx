"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { PokerTable } from '@/components/PokerTable';

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Retrieve guest data
    const storedName = localStorage.getItem('poker_username') || `Guest${Math.floor(Math.random()*1000)}`;
    const userId = localStorage.getItem('poker_userid') || 
                  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
    localStorage.setItem('poker_userid', userId);

    socket.emit('join_room', {
      roomId,
      userId,
      username: storedName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${storedName}`,
      gameType: searchParams.get('mode') || 'FAKE',
      entryAmount: parseInt(searchParams.get('entry') || '0')
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('error', (err) => {
      setError(err.message);
      setTimeout(() => setError(''), 3000); // Clear error after 3 seconds
    });

    return () => {
      socket.off('game_state');
      socket.off('error');
    };
  }, [socket, isConnected, roomId, searchParams]);

  if (!gameState) {
    return <div className="flex h-screen items-center justify-center text-stone-400 font-bold animate-pulse text-xl">Connecting to Room {roomId}...</div>;
  }

  return (
    <div className="h-[100dvh] w-screen bg-stone-950 flex flex-col overflow-hidden relative">
      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] bg-red-600/90 text-white px-5 py-2 rounded-full font-bold shadow-2xl border border-red-500 animate-bounce text-sm whitespace-nowrap">
          {error}
        </div>
      )}
      <PokerTable gameState={gameState} roomId={roomId} />
    </div>
  );
}
