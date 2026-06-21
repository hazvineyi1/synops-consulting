import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="w-[60vw] p-[3vw] rounded-2xl border bg-[#020617]/80 backdrop-blur-xl"
        style={{ borderColor: 'var(--color-primary)' }}
      >
        <motion.div
          className="w-16 h-16 mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary)' }}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: phase >= 1 ? 1 : 0, rotate: phase >= 1 ? 0 : -180 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </motion.div>

        <motion.h2 
          className="text-[3.5vw] font-bold text-white leading-tight mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -20 }}
        >
          Quality assurance isn't bolted on.
        </motion.h2>

        <motion.h3
          className="text-[2.5vw] text-white/70"
          style={{ fontFamily: 'var(--font-body)' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -20 }}
        >
          It's built into every step.
        </motion.h3>
      </motion.div>
    </motion.div>
  );
}
