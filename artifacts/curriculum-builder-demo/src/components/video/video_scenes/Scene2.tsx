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
        <div className={`px-3 py-2 rounded-md text-sm font-medium ${current === 'Dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>Dashboard</div>
      </div>
      <div>
        <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Build</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium ${current === 'Clients' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>Clients</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium ${current === 'Projects' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>Projects</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium ${current === 'Standards' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>Standards</div>
      </div>
      <div>
        <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Manage</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium ${current === 'Builders' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>Builders</div>
        <div className={`px-3 py-2 rounded-md text-sm font-medium ${current === 'Allocations' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>Allocations</div>
      </div>
    </div>

    <div className="px-6 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">JD</div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900">Jane Doe</span>
          <span className="text-xs text-slate-500">Sign out</span>
        </div>
      </div>
    </div>
  </div>
);

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 2600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const projects = [
    { title: "Biology 101", client: "University of Virginia", status: "Active", delay: 0 },
    { title: "Data Structures", client: "Georgia Tech", status: "Gate blocked", delay: 1 },
    { title: "Intro to Psychology", client: "NYU", status: "Active", delay: 2 },
    { title: "Advanced Calculus", client: "University of Virginia", status: "Active", delay: 3 },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10 px-[4vw]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[85vw] h-[80vh] bg-slate-50 rounded-xl overflow-hidden shadow-2xl flex border border-slate-200 relative">
        <Sidebar current="Projects" />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-10 py-8 bg-white border-b border-slate-200 flex justify-between items-end">
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                Compass <span className="text-slate-300">/</span> Projects
              </div>
              <motion.h1 
                className="text-3xl font-bold text-slate-900 tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 10 }}
              >
                Projects
              </motion.h1>
              <motion.p 
                className="text-slate-500 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 2 ? 1 : 0 }}
              >
                Every course design project, in order through the pipeline.
              </motion.p>
            </div>
            <motion.div 
              className="px-4 py-2 bg-blue-700 text-white rounded-md font-medium text-sm shadow-sm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: phase >= 2 ? 1 : 0.9, opacity: phase >= 2 ? 1 : 0 }}
            >
              New project
            </motion.div>
          </div>

          {/* Content */}
          <div className="flex-1 p-10 overflow-hidden bg-slate-50/50">
            <div className="grid grid-cols-2 gap-6">
              {projects.map((p, i) => (
                <motion.div 
                  key={i}
                  className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
                  transition={{ delay: p.delay * 0.1, type: 'spring', damping: 25 }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{p.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                        {p.client}
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded text-xs font-bold ${p.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                      {p.status}
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <span>1 Intake</span>
                      <span>2 Design</span>
                      <span>3 QA</span>
                      <span>4 Handoff</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                      <div className="h-full bg-blue-600 w-1/4" />
                      <div className="h-full bg-blue-600 w-1/4" />
                      <div className={`h-full ${p.status === 'Active' ? 'bg-blue-200' : 'bg-red-200'} w-1/4`} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-4 mt-2">
                    <span className="font-medium">Tier 1 • Canvas</span>
                    <span>Delivers Oct 15</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}