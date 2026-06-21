import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const Sidebar = ({ current }: { current: string }) => (
  <div className="w-[18vw] bg-white border-r border-slate-200 h-full flex flex-col pt-6 pb-4 shrink-0 shadow-lg">
    <div className="px-6 mb-8 flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/></svg>
      </div>
      <span className="font-bold text-lg text-slate-900 tracking-tight">Compass</span>
    </div>

    <div className="flex-1 px-4 space-y-6">
      <div>
        <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Overview</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium text-slate-600`}>Dashboard</div>
      </div>
      <div>
        <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Build</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium text-slate-600`}>Clients</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium bg-blue-50 text-blue-700`}>Projects</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium text-slate-600`}>Standards</div>
      </div>
    </div>
  </div>
);

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-[4vw]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[85vw] h-[80vh] bg-slate-50 rounded-xl overflow-hidden shadow-2xl flex border border-slate-200">
        <Sidebar current="Projects" />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-8 pt-6 pb-6 bg-white border-b border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">
                  Biology 101 <span className="text-slate-300 mx-1">/</span> Stage 3
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QA Report</h1>
              </div>
              <motion.div 
                className="px-4 py-2 bg-blue-700 text-white rounded-md font-medium text-sm shadow-sm flex items-center gap-2"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: phase >= 1 ? 1 : 0.9, opacity: phase >= 1 ? 1 : 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Export report
              </motion.div>
            </div>

            {/* Stage Rail */}
            <div className="flex relative">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-slate-100 -translate-y-1/2" />
              <div className="absolute left-0 w-2/3 top-1/2 h-[2px] bg-blue-600 -translate-y-1/2" />
              <div className="flex w-full justify-between relative z-10">
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <span className="text-xs font-bold text-slate-900">Intake</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <span className="text-xs font-bold text-slate-900">Design</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center text-[10px] font-bold text-blue-600">3</div>
                  <span className="text-xs font-bold text-blue-600">QA</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-[10px] font-bold text-slate-400">4</div>
                  <span className="text-xs font-bold text-slate-400">Handoff</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content - QA Report */}
          <div className="flex-1 p-8 overflow-hidden bg-slate-50/50 flex flex-col gap-6">
            
            <div className="flex gap-4">
              <motion.div 
                className="flex-1 bg-white border border-slate-200 rounded-lg p-4 flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
              >
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Accessibility</span>
                <span className="text-2xl font-bold text-slate-900">100% Compliant</span>
              </motion.div>
              <motion.div 
                className="w-32 bg-white border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center border-b-4 border-b-green-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
                transition={{ delay: 0.1 }}
              >
                <span className="text-3xl font-bold text-green-600 mb-1">{phase >= 4 ? '18' : '17'}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pass</span>
              </motion.div>
              <motion.div 
                className="w-32 bg-white border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center border-b-4 border-b-red-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
                transition={{ delay: 0.2 }}
              >
                <span className="text-3xl font-bold text-red-600 mb-1">{phase >= 4 ? '0' : '1'}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fail</span>
              </motion.div>
            </div>

            <motion.div 
              className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
            >
              <div className="grid grid-cols-[1fr_150px_2fr] border-b border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Check Name</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Findings</div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-[1fr_150px_2fr] border-b border-slate-100 p-4 items-center">
                  <div className="text-sm font-bold text-slate-900">OEDI Rubric</div>
                  <div><span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">Pass</span></div>
                  <div className="text-sm text-slate-600">All materials meet diverse learner requirements.</div>
                </div>

                <div className="grid grid-cols-[1fr_150px_2fr] border-b border-slate-100 p-4 items-center">
                  <div className="text-sm font-bold text-slate-900">WCAG 2.1 AA scan</div>
                  <div>
                    {phase >= 4 ? (
                      <motion.span 
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded inline-block"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring' }}
                      >
                        Pass
                      </motion.span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">Fail</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    {phase >= 4 ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>All color contrast ratios verified.</motion.span>
                    ) : (
                      <span className="text-red-600">Midterm instructions lack sufficient contrast (1.2:1).</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_150px_2fr] border-b border-slate-100 p-4 items-center">
                  <div className="text-sm font-bold text-slate-900">Alignment Verification</div>
                  <div><span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">Pass</span></div>
                  <div className="text-sm text-slate-600">Every assessment aligns to at least one LO.</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}