'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, type CityUser } from '@/store/useStore';

interface PersonNPCProps {
  data: CityUser;
}

/* ── colour helpers ── */
const darken = (hex: string, amount: number) => {
  const c = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (c >> 16) - amount);
  const g = Math.max(0, ((c >> 8) & 0xff) - amount);
  const b = Math.max(0, (c & 0xff) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
};

const lighten = (hex: string, amount: number) => {
  const c = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (c >> 16) + amount);
  const g = Math.min(255, ((c >> 8) & 0xff) + amount);
  const b = Math.min(255, (c & 0xff) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
};

/* ── skin tone from gender seed ── */
const getSkinColor = (gender: string, id: string) => {
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed += id.charCodeAt(i);
  const tones = ['#f5d0a9', '#e8b88a', '#d4a373', '#c49a6c', '#a0785a'];
  return tones[seed % tones.length];
};

export const PersonNPC: React.FC<PersonNPCProps> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const selectNPC = useStore(s => s.selectNPC);
  const selectedNPCId = useStore(s => s.selectedNPCId);
  const isSelected = selectedNPCId === data.id;
  const theme = useStore(s => s.theme);

  // Smooth position interpolation
  const currentPos = useRef(new THREE.Vector3(data.position.x, 0, data.position.z));
  const targetPos = useRef(new THREE.Vector3(data.position.x, 0, data.position.z));

  useEffect(() => {
    targetPos.current.set(data.position.x, 0, data.position.z);
  }, [data.position.x, data.position.z]);

  // Animation state
  const animTime = useRef(0);
  const walkCycle = useRef(0);

  const skinColor = useMemo(() => getSkinColor(data.gender, data.id), [data.gender, data.id]);
  const shirtColor = data.color;
  const pantsColor = useMemo(() => darken(shirtColor, 80), [shirtColor]);
  const shoeColor = '#2d2d2d';
  const hairColor = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < data.id.length; i++) seed += data.id.charCodeAt(i);
    const colors = ['#1a1a1a', '#3d2b1f', '#5c3a21', '#c4a35a', '#8b0000'];
    return colors[seed % colors.length];
  }, [data.id]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    animTime.current += delta;

    // Smooth position lerp
    currentPos.current.lerp(targetPos.current, Math.min(1, delta * 5));
    groupRef.current.position.set(currentPos.current.x, 0, currentPos.current.z);

    // Walk animation
    const isMoving = currentPos.current.distanceTo(targetPos.current) > 0.02;
    if (isMoving) {
      walkCycle.current += delta * 8;
      // Subtle body bob
      groupRef.current.position.y = Math.abs(Math.sin(walkCycle.current)) * 0.03;
    } else {
      // Idle sway
      walkCycle.current += delta * 1.5;
      groupRef.current.position.y = Math.sin(walkCycle.current * 0.5) * 0.01;
    }

    // Face direction of movement
    const dx = targetPos.current.x - currentPos.current.x;
    const dz = targetPos.current.z - currentPos.current.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const angle = Math.atan2(dx, dz);
      // Smooth rotation
      const currentRotY = groupRef.current.rotation.y;
      let diff = angle - currentRotY;
      // Normalize
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, delta * 6);
    }
  });

  const isMoving = useMemo(() => data.movementState === 'walking', [data.movementState]);
  const glowColor = hovered ? '#FFD700' : (isSelected ? '#34d399' : shirtColor);

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectNPC(isSelected ? null : data.id);
  };

  // Character dimensions
  const bodyH = 0.35;
  const headR = 0.1;
  const legH = 0.22;
  const armH = 0.28;
  const totalH = legH + bodyH + headR * 2 + 0.05;

  return (
    <group
      ref={groupRef}
      position={[data.position.x, 0, data.position.z]}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Hover / selection glow */}
      {(hovered || isSelected) && (
        <pointLight
          position={[0, totalH / 2, 0]}
          intensity={1.5}
          distance={6}
          color={glowColor}
        />
      )}

      {/* ── Legs ── */}
      <group position={[0, legH / 2, 0]}>
        {/* Left leg */}
        <mesh position={[-0.045, 0, 0]} castShadow>
          <boxGeometry args={[0.06, legH, 0.06]} />
          <meshStandardMaterial color={pantsColor} roughness={0.7} />
        </mesh>
        {/* Right leg */}
        <mesh position={[0.045, 0, 0]} castShadow>
          <boxGeometry args={[0.06, legH, 0.06]} />
          <meshStandardMaterial color={pantsColor} roughness={0.7} />
        </mesh>
      </group>

      {/* ── Shoes ── */}
      <group position={[0, 0.02, 0]}>
        <mesh position={[-0.045, 0, 0.01]} castShadow>
          <boxGeometry args={[0.07, 0.04, 0.09]} />
          <meshStandardMaterial color={shoeColor} roughness={0.9} />
        </mesh>
        <mesh position={[0.045, 0, 0.01]} castShadow>
          <boxGeometry args={[0.07, 0.04, 0.09]} />
          <meshStandardMaterial color={shoeColor} roughness={0.9} />
        </mesh>
      </group>

      {/* ── Torso / T-shirt ── */}
      <mesh position={[0, legH + bodyH / 2, 0]} castShadow>
        <boxGeometry args={[0.2, bodyH, 0.12]} />
        <meshStandardMaterial
          color={hovered ? '#FFD700' : shirtColor}
          roughness={0.5}
          emissive={hovered ? '#FFD700' : (isSelected ? shirtColor : '#000000')}
          emissiveIntensity={hovered ? 0.8 : (isSelected ? 0.3 : 0)}
        />
      </mesh>

      {/* ── Arms ── */}
      <group position={[0, legH + bodyH * 0.7, 0]}>
        {/* Left arm */}
        <mesh position={[-0.135, -armH / 2 + 0.05, 0]} castShadow>
          <boxGeometry args={[0.05, armH, 0.05]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
        {/* Right arm */}
        <mesh position={[0.135, -armH / 2 + 0.05, 0]} castShadow>
          <boxGeometry args={[0.05, armH, 0.05]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
      </group>

      {/* ── Neck ── */}
      <mesh position={[0, legH + bodyH + 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.04, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* ── Head ── */}
      <mesh position={[0, legH + bodyH + headR + 0.05, 0]} castShadow>
        <sphereGeometry args={[headR, 12, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* ── Hair ── */}
      <mesh position={[0, legH + bodyH + headR * 1.75 + 0.05, 0]} castShadow>
        <sphereGeometry args={[headR * 0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>

      {/* ── Eyes ── */}
      <group position={[0, legH + bodyH + headR + 0.05, headR * 0.85]}>
        <mesh position={[-0.03, 0.02, 0]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.03, 0.02, 0]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Pupils */}
        <mesh position={[-0.03, 0.02, 0.01]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.03, 0.02, 0.01]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* ── Name Label ── */}
      <Html
        position={[0, totalH + 0.15, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          padding: '2px 8px',
          borderRadius: '6px',
          border: `1px solid ${shirtColor}50`,
          whiteSpace: 'nowrap',
          fontFamily: "'Inter', sans-serif",
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '0.3px',
          }}>
            {data.name}
          </span>
        </div>
      </Html>

      {/* ── Selection ring ── */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.28, 24]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── Shadow circle ── */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  );
};
