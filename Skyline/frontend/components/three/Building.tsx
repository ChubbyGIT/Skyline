import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useStore, Building as BuildingType } from '@/store/useStore';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { playFireworkSound, playDemolishSound } from '@/lib/sounds';

interface BuildingProps {
  data: BuildingType;
}

/* ─── helpers ─── */

const generateSkyscraper = (height: number) => {
  const floors = Math.max(3, Math.floor(height / 0.6));
  const tier = height > 10 ? 'supertall' : height > 6 ? 'tall' : 'mid';

  return {
    // proportions
    lobbyHeight: Math.max(0.6, height * 0.08),
    bodyHeight: height * 0.82,
    crownHeight: height * 0.10,
    // widths taper slightly
    baseWidth: 1.1,
    bodyWidth: 1.0,
    topWidth: tier === 'supertall' ? 0.75 : tier === 'tall' ? 0.85 : 0.95,
    // window grid
    windowRows: floors,
    windowCols: 4,
    tier,
  };
};

const seedFromId = (id: string) => {
  let s = 0;
  for (let i = 0; i < id.length; i++) s += id.charCodeAt(i);
  return s;
};

/* ─── instanced window grid ─── */

const WindowGrid = ({ floors, cols, bodyHeight, bodyWidth, topWidth, theme, hovered }: any) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = floors * cols * 4; // 4 faces
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const winColor = hovered ? '#FFD700' : theme === 'day' ? '#8ec8e8' : '#ffe082';
  const winEmissive = hovered ? '#FFD700' : theme === 'day' ? '#5b9cc2' : '#ffb300';
  const winEI = hovered ? 2.0 : theme === 'day' ? 0.15 : 1.4;

  useEffect(() => {
    if (!meshRef.current) return;
    let idx = 0;
    const floorH = bodyHeight / floors;
    const colW = bodyWidth / cols;
    const wS = colW * 0.55;
    const hS = Math.min(floorH * 0.65, 0.55);

    for (let face = 0; face < 4; face++) {
      for (let fl = 0; fl < floors; fl++) {
        // per-floor width lerp (taper)
        const t = fl / Math.max(1, floors - 1);
        const floorWidth = bodyWidth + (topWidth - bodyWidth) * t;
        const y = fl * floorH + floorH * 0.5;

        for (let c = 0; c < cols; c++) {
          dummy.position.set(0, 0, 0);
          dummy.rotation.set(0, 0, 0);
          const xOff = -floorWidth / 2 + (c / cols) * floorWidth + floorWidth / cols * 0.5;
          const zOff = floorWidth / 2 + 0.006;

          if (face === 0) { dummy.position.set(xOff, y, zOff); }
          else if (face === 1) { dummy.position.set(xOff, y, -zOff); dummy.rotation.y = Math.PI; }
          else if (face === 2) { dummy.position.set(-zOff, y, xOff); dummy.rotation.y = -Math.PI / 2; }
          else { dummy.position.set(zOff, y, xOff); dummy.rotation.y = Math.PI / 2; }

          dummy.scale.set(wS, hS, 1);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [floors, cols, bodyHeight, bodyWidth, topWidth, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        color={winColor}
        emissive={winEmissive}
        emissiveIntensity={winEI}
        roughness={0.05}
        metalness={0.9}
        side={THREE.DoubleSide}
        transparent
        opacity={0.92}
      />
    </instancedMesh>
  );
};

/* ─── floor lines (horizontal mullions) ─── */
const FloorLines = ({ floors, bodyHeight, bodyWidth, topWidth, theme, hovered }: any) => {
  const elements: any[] = [];
  const lineColor = hovered ? '#FFD700' : theme === 'day' ? '#bcc5ce' : '#555555';
  const floorH = bodyHeight / floors;

  for (let fl = 1; fl < floors; fl++) {
    const t = fl / Math.max(1, floors - 1);
    const w = bodyWidth + (topWidth - bodyWidth) * t;
    const y = fl * floorH;

    // front & back
    elements.push(
      <mesh key={`fz-${fl}`} position={[0, y, w / 2 + 0.007]}>
        <planeGeometry args={[w, 0.02]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    );
    elements.push(
      <mesh key={`bz-${fl}`} position={[0, y, -(w / 2 + 0.007)]}>
        <planeGeometry args={[w, 0.02]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    );
    // left & right
    elements.push(
      <mesh key={`lx-${fl}`} position={[-(w / 2 + 0.007), y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w, 0.02]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    );
    elements.push(
      <mesh key={`rx-${fl}`} position={[w / 2 + 0.007, y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w, 0.02]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    );
  }
  return <>{elements}</>;
};

/* ─── main component ─── */

export const Building: React.FC<BuildingProps> = ({ data }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const {
    selectedBuildingId, selectBuilding, isRepositioning,
    memories, theme
  } = useStore();
  const isSelected = selectedBuildingId === data.id;
  const memory = memories.find(m => m.id === data.id);
  const seed = seedFromId(data.id);

  const bd = useMemo(() => generateSkyscraper(data.height), [data.height]);

  // per-building material variation
  const facadeColor = useMemo(() => {
    if (hovered) return '#FFD700';
    const bases = theme === 'day'
      ? ['#c5d5e4', '#b8c9d9', '#cdd8e3', '#d1dce6', '#afc4d6']
      : ['#2a3a4a', '#243444', '#1e2e3e', '#2f3f4f', '#1a2a3a'];
    return bases[seed % bases.length];
  }, [seed, theme, hovered]);

  const matProps = useMemo(() => {
    if (hovered) return { color: '#FFD700', metalness: 0.15, roughness: 0.2, emissive: '#FFD700', emissiveIntensity: 1.5, clearcoat: 0.6 };
    return {
      color: facadeColor,
      metalness: 0.45 + (seed % 3) * 0.08,
      roughness: 0.12 + (seed % 4) * 0.04,
      emissive: theme === 'night' ? data.color : (isSelected ? '#ffffff' : '#000000'),
      emissiveIntensity: theme === 'night' ? 0.25 : (isSelected ? 0.25 : 0),
      clearcoat: 0.7,
    };
  }, [facadeColor, seed, theme, data.color, isSelected, hovered]);

  /* ─── animations ─── */
  useEffect(() => {
    if (meshRef.current && data.isAnimating) {
      gsap.fromTo(meshRef.current.scale, { y: 0 }, { y: 1, duration: 1.5, ease: 'elastic.out(1, 0.3)' });
      gsap.fromTo(meshRef.current.position, { y: -data.height }, { y: 0, duration: 1.5, ease: 'elastic.out(1, 0.3)' });
      // Firework sound + visuals
      playFireworkSound();
      const end = Date.now() + 1000;
      const frame = () => {
        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: [data.color, '#ffffff'] });
        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: [data.color, '#ffffff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [data.id, data.isAnimating, data.height, data.color]);

  useEffect(() => {
    if (meshRef.current && data.isDeleting) {
      playDemolishSound();
      gsap.to(meshRef.current.scale, { y: 0, duration: 0.8, ease: 'power2.in' });
      gsap.to(meshRef.current.position, { y: -data.height, duration: 0.8, ease: 'power2.in' });
    }
  }, [data.isDeleting, data.height]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isRepositioning) selectBuilding(isSelected ? null : data.id);
  };

  const totalH = bd.lobbyHeight + bd.bodyHeight + bd.crownHeight;
  const lobbyColor = hovered ? '#FFD700' : theme === 'day' ? '#8a9bab' : '#1e2e3e';
  const crownColor = hovered ? '#FFD700' : theme === 'day' ? '#d0dbe5' : '#3a4a5a';

  return (
    <group
      ref={meshRef}
      position={[data.position.x, 0, data.position.z]}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Hover glow */}
      {hovered && (
        <pointLight position={[0, totalH / 2, 0]} intensity={2} distance={15} color="#FFD700" />
      )}

      {/* ── 1. Ground-level entrance lobby ── */}
      <mesh position={[0, bd.lobbyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bd.baseWidth, bd.lobbyHeight, bd.baseWidth]} />
        <meshStandardMaterial color={lobbyColor} roughness={0.6} metalness={0.3} emissive={isSelected ? '#ffffff' : '#000000'} emissiveIntensity={isSelected ? 0.2 : 0} />
      </mesh>
      {/* Lobby entrance panel (front) */}
      <mesh position={[0, bd.lobbyHeight * 0.45, bd.baseWidth / 2 + 0.005]}>
        <planeGeometry args={[bd.baseWidth * 0.5, bd.lobbyHeight * 0.7]} />
        <meshStandardMaterial
          color={hovered ? '#FFD700' : theme === 'day' ? '#5a8ab5' : '#ffe082'}
          emissive={hovered ? '#FFD700' : theme === 'night' ? '#ffb300' : '#000000'}
          emissiveIntensity={hovered ? 1.5 : theme === 'night' ? 0.8 : 0}
          transparent opacity={0.85}
        />
      </mesh>
      {/* Lobby canopy overhang */}
      <mesh position={[0, bd.lobbyHeight, 0]} castShadow>
        <boxGeometry args={[bd.baseWidth + 0.15, 0.06, bd.baseWidth + 0.15]} />
        <meshStandardMaterial color={hovered ? '#FFD700' : '#707d8a'} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ── 2. Main glass tower body (tapered) ── */}
      <group position={[0, bd.lobbyHeight, 0]}>
        {/* Procedural tapered body: we stack a few sections for the taper effect */}
        {(() => {
          const sections = Math.min(6, Math.max(2, Math.ceil(bd.bodyHeight / 2)));
          const sectionH = bd.bodyHeight / sections;
          const els: any[] = [];
          for (let s = 0; s < sections; s++) {
            const t0 = s / sections;
            const t1 = (s + 1) / sections;
            const wBot = bd.bodyWidth + (bd.topWidth - bd.bodyWidth) * t0;
            const wTop = bd.bodyWidth + (bd.topWidth - bd.bodyWidth) * t1;
            els.push(
              <mesh key={`sec-${s}`} position={[0, s * sectionH + sectionH / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[(wBot + wTop) / 2, sectionH, (wBot + wTop) / 2]} />
                <meshPhysicalMaterial
                  color={matProps.color}
                  metalness={matProps.metalness}
                  roughness={matProps.roughness}
                  emissive={matProps.emissive}
                  emissiveIntensity={matProps.emissiveIntensity}
                  clearcoat={matProps.clearcoat as any}
                  clearcoatRoughness={0.1}
                />
              </mesh>
            );
            // Thin horizontal band between sections (structural floor line)
            if (s > 0) {
              els.push(
                <mesh key={`band-${s}`} position={[0, s * sectionH, 0]}>
                  <boxGeometry args={[wBot + 0.04, 0.04, wBot + 0.04]} />
                  <meshStandardMaterial color={hovered ? '#FFD700' : '#8a9bab'} metalness={0.5} roughness={0.3} />
                </mesh>
              );
            }
          }
          return els;
        })()}

        {/* Floor line details on glass facade */}
        <FloorLines
          floors={bd.windowRows}
          bodyHeight={bd.bodyHeight}
          bodyWidth={bd.bodyWidth}
          topWidth={bd.topWidth}
          theme={theme}
          hovered={hovered}
        />

        {/* Glass curtain-wall windows */}
        <WindowGrid
          floors={bd.windowRows}
          cols={bd.windowCols}
          bodyHeight={bd.bodyHeight}
          bodyWidth={bd.bodyWidth}
          topWidth={bd.topWidth}
          theme={theme}
          hovered={hovered}
        />

        {/* Vertical mullion columns (corners) */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
          <mesh key={`col-${i}`} position={[sx * bd.bodyWidth / 2, bd.bodyHeight / 2, sz * bd.bodyWidth / 2]} castShadow>
            <boxGeometry args={[0.06, bd.bodyHeight, 0.06]} />
            <meshStandardMaterial color={hovered ? '#FFD700' : theme === 'day' ? '#8a9bab' : '#3a4a5a'} metalness={0.5} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ── 3. Crown / mechanical penthouse ── */}
      <group position={[0, bd.lobbyHeight + bd.bodyHeight, 0]}>
        {/* Crown base slab */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <boxGeometry args={[bd.topWidth + 0.08, 0.04, bd.topWidth + 0.08]} />
          <meshStandardMaterial color={hovered ? '#FFD700' : '#8a9bab'} metalness={0.6} roughness={0.25} />
        </mesh>
        {/* Crown body */}
        <mesh position={[0, bd.crownHeight / 2, 0]} castShadow>
          <boxGeometry args={[bd.topWidth * 0.7, bd.crownHeight, bd.topWidth * 0.7]} />
          <meshPhysicalMaterial
            color={crownColor}
            metalness={0.5}
            roughness={0.2}
            emissive={theme === 'night' ? data.color : '#000000'}
            emissiveIntensity={theme === 'night' ? 0.4 : 0}
            clearcoat={0.5}
          />
        </mesh>
        {/* Mechanical rooftop equipment (AC units) */}
        <mesh position={[bd.topWidth * 0.15, bd.crownHeight + 0.08, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 0.25]} />
          <meshStandardMaterial color={hovered ? '#FFD700' : '#6b7b8b'} roughness={0.7} />
        </mesh>
        <mesh position={[-bd.topWidth * 0.15, bd.crownHeight + 0.08, 0.1]} castShadow>
          <boxGeometry args={[0.15, 0.12, 0.15]} />
          <meshStandardMaterial color={hovered ? '#FFD700' : '#6b7b8b'} roughness={0.7} />
        </mesh>
      </group>

      {/* ── 4. Antenna / spire (tall buildings) ── */}
      {data.height > 8 && (
        <group position={[0, totalH, 0]}>
          {/* Antenna pole */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.025, 0.06, 1.2, 8]} />
            <meshStandardMaterial color={hovered ? '#FFD700' : '#d0d5da'} metalness={0.8} roughness={0.15} />
          </mesh>
          {/* Aviation warning light */}
          <mesh position={[0, 1.25, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial
              color="#ff3333"
              emissive="#ff0000"
              emissiveIntensity={theme === 'night' || isSelected ? 3 : 1}
            />
          </mesh>
        </group>
      )}

      {/* ── 5. Selection ring ── */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[bd.baseWidth * 0.8, bd.baseWidth * 0.9, 32]} />
          <meshBasicMaterial color="#fcd34d" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

    </group>
  );
};

