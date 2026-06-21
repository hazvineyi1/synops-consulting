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

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 3600),
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
          <div className="px-8 pt-6 pb-0 bg-white border-b border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">
                  Biology 101 <span className="text-slate-300 mx-1">/</span> Stage 2
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Design Workspace</h1>
              </div>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m3 15 2 2 4-4"/></svg>
                Backward Design
              </div>
            </div>

            {/* Stage Rail */}
            <div className="flex mb-6 relative">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-slate-100 -translate-y-1/2" />
              <div className="absolute left-0 w-1/3 top-1/2 h-[2px] bg-blue-600 -translate-y-1/2" />
              <div className="flex w-full justify-between relative z-10">
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <span className="text-xs font-bold text-slate-900">Intake</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center text-[10px] font-bold text-blue-600">2</div>
                  <span className="text-xs font-bold text-blue-600">Design</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-[10px] font-bold text-slate-400">3</div>
                  <span className="text-xs font-bold text-slate-400">QA</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-[10px] font-bold text-slate-400">4</div>
                  <span className="text-xs font-bold text-slate-400">Handoff</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200">
              <div className="pb-3 text-sm font-medium text-slate-500">Assessments</div>
              <div className="pb-3 text-sm font-medium text-slate-500">Activities</div>
              <div className="pb-3 text-sm font-medium text-slate-500">Methods</div>
              <div className="pb-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600">Alignment map</div>
            </div>
          </div>

          {/* Content - Alignment Map */}
          <div className="flex-1 p-8 overflow-hidden bg-slate-50/50 flex flex-col">
            <motion.div 
              className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
            >
              <div className="grid grid-cols-[300px_1fr] border-b border-slate-200 bg-slate-50/50">
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Learning Objectives</div>
                <div className="grid grid-cols-2">
                  <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Assessments</div>
                  <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Activities</div>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                {/* Row 1 */}
                <div className="grid grid-cols-[300px_1fr] border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                  <div className="p-5 border-r border-slate-100 flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded shrink-0">LO1</div>
                    <div className="text-sm text-slate-700 leading-snug">Analyze cellular division processes and their implications.</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="p-5 border-r border-slate-100 flex flex-wrap gap-2 items-start content-start">
                      <div className="w-full text-sm text-slate-900 font-medium mb-1">Midterm Exam (Q4-8)</div>
                      <motion.div 
                        className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.8 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>
                        LO1
                      </motion.div>
                    </div>
                    <div className="p-5 flex flex-wrap gap-2 items-start content-start">
                      <div className="w-full text-sm text-slate-900 font-medium mb-1">Lab 3: Mitosis Observation</div>
                      <motion.div 
                        className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: phase >= 3 ? 1 : 0, scale: phase >= 3 ? 1 : 0.8 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>
                        LO1
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-[300px_1fr] border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                  <div className="p-5 border-r border-slate-100 flex items-start gap-3">
                    <div className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded shrink-0">LO2</div>
                    <div className="text-sm text-slate-700 leading-snug">Evaluate genetic inheritance patterns across generations.</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="p-5 border-r border-slate-100 flex flex-wrap gap-2 items-start content-start">
                      <div className="w-full text-sm text-slate-900 font-medium mb-1">Final Project</div>
                      <motion.div 
                        className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: phase >= 4 ? 1 : 0, scale: phase >= 4 ? 1 : 0.8 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>
                        LO2
                      </motion.div>
                    </div>
                    <div className="p-5 flex flex-wrap gap-2 items-start content-start">
                      <div className="w-full text-sm text-slate-900 font-medium mb-1">Group Discussion 4</div>
                      <motion.div 
                        className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: phase >= 5 ? 1 : 0, scale: phase >= 5 ? 1 : 0.8 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>
                        LO2
                      </motion.div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}