import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="w-[50vw] bg-white rounded-xl overflow-hidden shadow-2xl"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: phase >= 1 ? 0 : 50, opacity: phase >= 1 ? 1 : 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="ml-4 text-sm font-mono text-gray-500">QA_Report.md</span>
        </div>
        
        <div className="p-8 text-gray-800 font-mono text-lg space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -10 }}
          >
            <span className="text-blue-600 font-bold">#</span> Accessibility Check
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -10 }}
            transition={{ delay: 0.1 }}
          >
            - [x] WCAG 2.1 AA Compliant
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : -10 }}
          >
            - [x] High-contrast typography
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : -10 }}
            transition={{ delay: 0.1 }}
          >
            - [x] Semantic structure verified
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
