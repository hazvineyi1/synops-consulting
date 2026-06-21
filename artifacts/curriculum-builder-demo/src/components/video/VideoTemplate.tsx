import { useEffect, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = { open: 3500, dashboard: 3500, design: 5000, qa: 5000, close: 4000 };

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  open: Scene1,
  dashboard: Scene2,
  design: Scene3,
  qa: Scene4,
  close: Scene5,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 font-sans">
      {/* Persistent background layers */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute inset-0 blur-[100px] bg-blue-900/30"
          animate={{
            x: ['-20%', '20%', '-10%'],
            y: ['10%', '-20%', '10%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        
        <img 
          src={`${import.meta.env.BASE_URL}images/grid-bg.png`}
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-20"
        />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
