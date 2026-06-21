import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: phase >= 1 ? 1 : 0.8, opacity: phase >= 1 ? 1 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}images/logo-mark.png`} 
          alt="Synops Logo" 
          className="w-[12vw] h-[12vw] object-contain mb-8"
        />
        
        <div className="overflow-hidden">
          <motion.h1 
            className="text-[4vw] font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
            initial={{ y: '100%' }}
            animate={{ y: phase >= 1 ? '0%' : '100%' }}
            transition={{ type: 'spring', damping: 20, delay: 0.2 }}
          >
            Curriculum Builder
          </motion.h1>
        </div>
        
        <div className="overflow-hidden mt-4">
          <motion.p 
            className="text-[2vw] text-white/60 font-medium tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-body)' }}
            initial={{ y: '100%' }}
            animate={{ y: phase >= 2 ? '0%' : '100%' }}
            transition={{ type: 'spring', damping: 20 }}
          >
            by Synops Advisory Group
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}
