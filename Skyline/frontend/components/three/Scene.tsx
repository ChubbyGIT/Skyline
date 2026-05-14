'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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

/* ── Simple voxel-style clouds for day mode ── */
const CloudPuff: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 1 }) => {
  const puffs = useMemo(() => {
    const arr: { pos: [number, number, number]; r: number }[] = [];
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      arr.push({
        pos: [
          (Math.random() - 0.5) * 3 * scale,
          (Math.random() - 0.5) * 0.8 * scale,
          (Math.random() - 0.5) * 1.5 * scale,
        ],
        r: (0.8 + Math.random() * 1.2) * scale,
      });
    }
    return arr;
  }, [scale]);

  return (
    <group position={position}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.r, 10, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={1}
            metalness={0}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
};

const DayClouds: React.FC = () => {
  const clouds = useMemo(() => {
    const positions: [number, number, number][] = [
      [-30, 35, -20], [20, 38, -35], [45, 33, 10], [-15, 40, 30],
      [10, 36, -50], [-40, 34, 15], [35, 37, 40], [-25, 39, -40],
      [50, 35, -25], [-50, 36, -10], [0, 38, 50], [30, 34, -15],
    ];
    return positions.map(pos => ({ pos, scale: 0.6 + Math.random() * 0.6 }));
  }, []);

  return (
    <>
      {clouds.map((c, i) => (
        <CloudPuff key={i} position={c.pos} scale={c.scale} />
      ))}
    </>
  );
};

/* ── Updates scene bg/fog when theme changes dynamically ── */
const SceneEnvironment: React.FC<{ theme: 'day' | 'night' }> = ({ theme }) => {
  const { scene } = useThree();

  useEffect(() => {
    const bg = theme === 'day' ? '#87CEEB' : '#1a2332';
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.Fog(bg, 20, theme === 'day' ? 100 : 80);
  }, [theme, scene]);

  return null;
};

export const Scene: React.FC = () => {
  const theme = useStore((state) => state.theme);
  const selectNPC = useStore((state) => state.selectNPC);
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
        transition: 'background-color 0.5s ease',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [15, 15, 15], fov: 45 }}
        gl={{ antialias: true }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onPointerMissed={() => selectNPC(null)}
        onCreated={({ scene, gl }) => {
          scene.background = new THREE.Color(bg);
          scene.fog = new THREE.Fog(bg, 20, theme === 'day' ? 100 : 80);
          gl.shadowMap.enabled = true;
        }}
      >
        {/* Dynamic environment updater (reacts to theme toggle) */}
        <SceneEnvironment theme={theme} />
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

        {/* Clouds — day sky only */}
        {theme === 'day' && <DayClouds />}

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
