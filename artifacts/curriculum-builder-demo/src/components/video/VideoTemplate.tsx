import { useEffect, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = { open: 4000, pipeline: 5000, differentiator: 4500, quality: 4000, close: 4500 };

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  open: Scene1,
  pipeline: Scene2,
  differentiator: Scene3,
  quality: Scene4,
  close: Scene5,
};

const sceneBgStyles = [
  { opacity: 0.1, scale: 1.1, blur: 0 },
  { opacity: 0.05, scale: 1.5, blur: 4 },
  { opacity: 0, scale: 1, blur: 0 },
  { opacity: 0.15, scale: 1.05, blur: 2 },
  { opacity: 0.05, scale: 1.2, blur: 8 }
];

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
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];
  const bg = sceneBgStyles[sceneIndex] ?? sceneBgStyles[0];
  const isQaScene = sceneIndex === 2 || sceneIndex === 3;

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
      {/* Persistent background layers */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute inset-0 blur-[100px]"
          style={{ backgroundColor: 'var(--color-primary)', opacity: 0.2 }}
          animate={{
            x: ['-20%', '20%', '-10%'],
            y: ['10%', '-20%', '10%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute inset-0 blur-[120px]"
          style={{ backgroundColor: 'var(--color-accent)', opacity: 0.2 }}
          animate={{
            x: ['20%', '-20%', '20%'],
            y: ['-10%', '20%', '-10%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/grid-bg.png`}
          className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
          animate={{
            opacity: isQaScene ? 0 : bg.opacity,
            scale: bg.scale,
            filter: `blur(${bg.blur}px)`
          }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <motion.img 
          src={`${import.meta.env.BASE_URL}images/qa-bg.png`}
          className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isQaScene ? 0.3 : 0,
            scale: isQaScene ? 1.05 : 1.2,
          }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
