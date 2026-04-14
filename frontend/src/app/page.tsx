"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Spade, Diamond, Club, Heart, LogIn, Plus } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // Real Money Mode states
  const [gameMode, setGameMode] = useState<'FAKE' | 'REAL'>('FAKE');
  const [entryAmount, setEntryAmount] = useState('10');

  const handleAction = (type: 'create' | 'join') => {
    if (!username) return alert('Enter a username to play!');
    localStorage.setItem('poker_username', username);

    if (type === 'create') {
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      // We pass settings in query params for the first joiner (host) to initialize the room
      router.push(`/room/${code}?mode=${gameMode}&entry=${entryAmount}`);
    } else {
      if (!roomCode) return alert('Enter a room code');
      router.push(`/room/${roomCode}`);
    }
  };

  return (
    <main className="min-h-screen bg-stone-950 flex flex-col items-center justify-center relative overflow-hidden text-stone-100 px-4">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/30 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/40 blur-[150px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md p-6 md:p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl"
      >
        <div className="flex justify-center space-x-2 md:space-x-3 mb-4 md:mb-6 items-center">
             <Spade className="text-white w-6 h-6 md:w-8 md:h-8" />
             <Heart className="text-rose-500 w-6 h-6 md:w-8 md:h-8" />
             <Club className="text-emerald-400 w-6 h-6 md:w-8 md:h-8" />
             <Diamond className="text-blue-400 w-6 h-6 md:w-8 md:h-8" />
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 text-center mb-6 md:mb-8 tracking-tight">
          Texas Hold'em
        </h1>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] md:text-sm font-medium text-stone-400 mb-2 block uppercase tracking-wider">Your Nickname</label>
            <input 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition duration-200"
              placeholder="e.g. Maverick"
            />
          </div>

          <div className="pt-4 border-t border-stone-800">
             <label className="text-[10px] md:text-sm font-medium text-stone-400 mb-3 block uppercase tracking-wider">Game Mode</label>
             <div className="grid grid-cols-2 gap-2 bg-stone-900/80 p-1 rounded-xl border border-stone-800">
                <button 
                  onClick={() => setGameMode('FAKE')}
                  className={`py-2 rounded-lg text-sm font-bold transition ${gameMode === 'FAKE' ? 'bg-stone-700 text-white shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
                >
                  Fake Money
                </button>
                <button 
                  onClick={() => setGameMode('REAL')}
                  className={`py-2 rounded-lg text-sm font-bold transition ${gameMode === 'REAL' ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
                >
                  Real Money
                </button>
             </div>
          </div>

          {gameMode === 'REAL' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl"
            >
               <label className="text-[10px] md:text-xs font-bold text-emerald-400/80 mb-2 block uppercase">Entry Amount (₹)</label>
               <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    className="flex-1 bg-stone-900/80 border border-stone-700 rounded-lg px-4 py-2 text-xl font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-stone-400 text-xs">₹{entryAmount} = 10k chips</span>
               </div>
            </motion.div>
          )}

          <div className="flex gap-3">
             <button 
               onClick={() => handleAction('create')}
               className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.4)] transition duration-200"
             >
                <Plus size={20} /> Create Room
             </button>
             
             <button 
               onClick={() => setIsJoining(!isJoining)}
               className="flex-1 flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold py-3.5 px-4 rounded-xl border border-stone-700 transition duration-200"
             >
                <LogIn size={20} /> Join Room
             </button>
          </div>

          {isJoining && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="pt-4 border-t border-stone-800"
            >
               <div className="flex gap-2">
                 <input 
                   value={roomCode}
                   onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                   className="flex-1 bg-stone-900/50 border border-stone-800 rounded-xl px-4 py-3 font-mono tracking-widest text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                   placeholder="CODE"
                   maxLength={8}
                 />
                 <button onClick={() => handleAction('join')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl font-bold transition">
                   GO
                 </button>
               </div>
            </motion.div>
          )}

        </div>
      </motion.div>
      
      <p className="mt-12 text-stone-600 text-sm z-10 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
        1,304 Players Online
      </p>
    </main>
  );
}
