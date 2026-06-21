import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const STAGES = ['Intake', 'Design', 'QA', 'Handoff'];

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-[10vw]"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2 
        className="text-[3vw] font-bold mb-[8vh] text-white tracking-tight"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        A powerful pipeline
      </motion.h2>

      <div className="flex w-full justify-between items-center relative">
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1 bg-white/10 top-1/2 -translate-y-1/2 rounded-full" />
        
        {/* Progress track */}
        <motion.div 
          className="absolute left-0 h-1 top-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: 'var(--color-secondary)' }}
          initial={{ width: '0%' }}
          animate={{ width: phase >= 1 ? '100%' : '0%' }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {STAGES.map((stage, i) => (
          <div key={stage} className="relative flex flex-col items-center">
            <motion.div 
              className="w-[3vw] h-[3vw] rounded-full border-2 bg-[#020617] flex items-center justify-center relative z-10"
              style={{ borderColor: 'var(--color-secondary)' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ delay: i * 0.5, type: 'spring', damping: 15 }}
            >
              <motion.div 
                className="w-1/2 h-1/2 rounded-full"
                style={{ backgroundColor: 'var(--color-accent)' }}
                initial={{ scale: 0 }}
                animate={phase >= 1 ? { scale: 1 } : { scale: 0 }}
                transition={{ delay: i * 0.5 + 0.2, type: 'spring' }}
              />
            </motion.div>
            
            <motion.div
              className="absolute top-full mt-4 text-[1.5vw] font-medium text-white/80"
              style={{ fontFamily: 'var(--font-body)' }}
              initial={{ y: 20, opacity: 0 }}
              animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              transition={{ delay: i * 0.5 + 0.1 }}
            >
              {stage}
            </motion.div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
