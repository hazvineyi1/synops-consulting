import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative overflow-hidden mb-6">
        <motion.h1 
          className="text-[6vw] font-bold text-center leading-tight tracking-tight text-white"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ y: '100%' }}
          animate={{ y: phase >= 1 ? '0%' : '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
          Building curriculum
        </motion.h1>
      </div>
      
      <div className="relative overflow-hidden">
        <motion.h1 
          className="text-[6vw] font-bold text-center leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
          initial={{ y: '100%' }}
          animate={{ y: phase >= 2 ? '0%' : '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
          shouldn't be abstract.
        </motion.h1>
      </div>

      <motion.div 
        className="absolute w-full h-[1px]"
        style={{ backgroundColor: 'var(--color-primary)' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 0.5 : 0 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
