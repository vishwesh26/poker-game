import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';

export const OrientationGuard = ({ children }: { children: React.ReactNode }) => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      setIsPortrait(portrait);
      setIsMobile(mobile);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // We only show the guard on mobile devices in portrait mode
  const showGuard = isMobile && isPortrait;

  return (
    <>
      <AnimatePresence>
        {showGuard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-stone-950 flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              animate={{ rotate: 90 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-emerald-500 mb-6"
            >
              <Smartphone size={64} strokeWidth={1.5} />
            </motion.div>
            
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Rotate Your Device</h2>
            <p className="text-stone-400 text-sm max-w-[250px] font-medium leading-relaxed">
              This poker table is designed for a widescreen horizontal view. Please turn your phone to landscape mode to play.
            </p>

            <div className="mt-12 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={showGuard ? 'hidden' : 'block'}>
        {children}
      </div>
    </>
  );
};
