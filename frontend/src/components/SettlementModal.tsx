import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingDown, TrendingUp, History, ArrowRight, Users } from 'lucide-react';
import { chipsToRupees } from '@/utils/currency';

interface Settlement {
  playerId: string;
  username: string;
  chipsAtExit: number;
  valueInRupees: number;
  netAmount: number;
  status: 'WIN' | 'LOSS';
  time: string;
}

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export const SettlementModal = ({
  isOpen,
  onClose,
  settlements = [],
  instructions = [],
  entryAmount,
  gameType
}: {
  isOpen: boolean;
  onClose: () => void;
  settlements: Settlement[];
  instructions: Transaction[];
  entryAmount: number;
  gameType: 'FAKE' | 'REAL';
}) => {
  const [tab, setTab] = useState<'history' | 'payments'>('history');
  if (!isOpen) return null;

  const sorted = [...settlements].sort((a, b) => a.netAmount - b.netAmount);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="bg-stone-900 border border-stone-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
          style={{ maxHeight: '88dvh' }}
        >
          {/* ── Header (fixed) ── */}
          <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-900 rounded-t-3xl sm:rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-500/10 rounded-xl">
                <History className="text-emerald-500" size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Settlement</h2>
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">{gameType} Mode · {sorted.length} records</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-800 rounded-full text-stone-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Tabs (fixed, only show if REAL mode has payments) ── */}
          {gameType === 'REAL' && (
            <div className="flex-none flex border-b border-stone-800 bg-stone-900/80">
              {(['history', 'payments'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition
                    ${tab === t
                      ? 'text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-stone-600 hover:text-stone-400'}`}
                >
                  {t === 'history' ? '📋 History' : '💸 Who Pays Whom'}
                </button>
              ))}
            </div>
          )}

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">

            {/* HISTORY TAB */}
            {tab === 'history' && (
              <div className="p-3 space-y-1.5">
                {sorted.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-2 text-stone-700">
                    <Users size={32} strokeWidth={1} />
                    <p className="text-sm font-bold">No exits recorded yet</p>
                    <p className="text-xs">Players who leave early will appear here</p>
                  </div>
                ) : (
                  sorted.map((s, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center justify-between bg-stone-800/40 hover:bg-stone-800/70 transition rounded-2xl px-3 py-2.5 border border-stone-800/60"
                    >
                      {/* Left: name + time */}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-sm truncate">{s.username}</span>
                        <span className="text-[9px] text-stone-600 font-mono">
                          {new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Middle: chips */}
                      <div className="hidden sm:flex flex-col items-center text-center mx-3">
                        <span className="text-[9px] text-stone-600 uppercase font-bold">Exit</span>
                        <span className="font-mono text-stone-400 text-xs">{s.chipsAtExit.toLocaleString()}</span>
                      </div>

                      {/* Right: net result */}
                      <div className={`flex items-center gap-1 font-black text-sm flex-shrink-0
                        ${s.status === 'WIN' ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {s.status === 'WIN' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>
                          {s.status === 'WIN' ? '+' : ''}
                          {gameType === 'REAL' ? `₹${Math.abs(s.netAmount).toFixed(2)}` : `$${s.netAmount}`}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* WHO PAYS WHOM TAB */}
            {tab === 'payments' && (
              <div className="p-3 space-y-1.5">
                {instructions.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-2 text-stone-700">
                    <TrendingUp size={32} strokeWidth={1} />
                    <p className="text-sm font-bold">All settled!</p>
                    <p className="text-xs">No outstanding payments</p>
                  </div>
                ) : (
                  instructions.map((t, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between bg-stone-800/40 hover:bg-stone-800/70 transition rounded-2xl px-3 py-2.5 border border-stone-800/60"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-black text-rose-400 truncate max-w-[90px]">{t.from}</span>
                        <ArrowRight size={12} className="text-stone-600 flex-none" />
                        <span className="font-black text-emerald-400 truncate max-w-[90px]">{t.to}</span>
                      </div>
                      <div className="flex-none ml-2 bg-emerald-950/50 border border-emerald-800/50 rounded-xl px-3 py-1">
                        <span className="text-emerald-400 font-mono font-bold text-sm">₹{t.amount.toFixed(2)}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Footer (fixed) ── */}
          <div className="flex-none flex justify-between items-center px-4 py-2.5 border-t border-stone-800 bg-stone-950/60 text-[9px] text-stone-600 font-bold uppercase tracking-widest rounded-b-3xl">
            <span>Entry · {gameType === 'REAL' ? `₹${entryAmount}` : 'Practice'}</span>
            <span>{sorted.length} player{sorted.length !== 1 ? 's' : ''} exited</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
