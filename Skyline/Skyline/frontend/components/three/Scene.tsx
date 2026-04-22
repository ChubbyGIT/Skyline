'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, Stars } from '@react-three/drei';
import { City } from './City';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

const SceneLighting: React.FC<{ theme: 'day' | 'night' }> = ({ theme }) => (
  <>
    <ambientLight intensity={theme === 'day' ? 0.7 : 0.3} />
    <directionalLight
      position={[10, 20, 10]}
      intensity={theme === 'day' ? 1.4 : 0.35}
      castShadow
    />
    <hemisphereLight
      color={theme === 'day' ? '#87CEEB' : '#1a2332'}
      groundColor={theme === 'day' ? '#90EE90' : '#1a4d1a'}
      intensity={theme === 'day' ? 0.5 : 0.3}
    />
    {theme === 'night' && (
      <>
        <directionalLight position={[-30, 40, -30]} intensity={0.4} color="#b8c5d6" />
        <pointLight position={[0, 20, 0]} intensity={0.3} color="#4a7ba7" distance={60} />
      </>
    )}
  </>
);

export const Scene: React.FC = () => {
  const theme = useStore((state) => state.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const bg = theme === 'day' ? '#87CEEB' : '#1a2332';
  const ground = theme === 'day' ? '#90EE90' : '#1a4d1a';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: bg,
      }}
    >
      <Canvas
        shadows
        camera={{ position: [15, 15, 15], fov: 45 }}
        gl={{ antialias: true }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onCreated={({ scene, gl }) => {
          scene.background = new THREE.Color(bg);
          scene.fog = new THREE.Fog(bg, 20, theme === 'day' ? 100 : 80);
          gl.shadowMap.enabled = true;
        }}
      >
        <SceneLighting theme={theme} />

        {/* Stars — night sky only */}
        {theme === 'night' && (
          <Stars
            radius={180}
            depth={60}
            count={4000}
            factor={3.5}
            saturation={0.4}
            fade
            speed={0.6}
          />
        )}

        {/* Infinite ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color={ground} roughness={1} metalness={0} />
        </mesh>

        {/* City buildings */}
        <Suspense fallback={null}>
          <City />
        </Suspense>

        {/* Controls — client only */}
        {mounted && (
          <MapControls
            makeDefault
            minDistance={5}
            maxDistance={80}
            maxPolarAngle={Math.PI / 2.1}
            listenToKeyEvents={window}
            keys={{ LEFT: 'KeyA', UP: 'KeyW', RIGHT: 'KeyD', BOTTOM: 'KeyS' }}
            keyPanSpeed={10}
          />
        )}
      </Canvas>
    </div>
  );
};
