import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useStore, Building as BuildingType } from '@/store/useStore';
import * as THREE from 'three';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { playFireworkSound, playDemolishSound } from '@/lib/sounds';

interface HouseProps { data: BuildingType; readOnly?: boolean; }

const seedFromId = (id: string) => {
  let s = 0;
  for (let i = 0; i < id.length; i++) s += id.charCodeAt(i);
  return s;
};

/* ── helpers ── */

const WoodTrim = ({ color, ...props }: any) => (
  <meshStandardMaterial color={color} roughness={0.78} metalness={0.08} {...props} />
);

/* ── Window Pane ── */
const WindowPane = ({ pos, rot, theme, hovered, size = [0.22, 0.28] }: any) => {
  const isDark = theme === 'night';
  const glassColor = hovered ? '#FFD700' : isDark ? '#ffe082' : '#8ec8e8';
  const glassEmissive = hovered ? '#FFD700' : isDark ? '#ffb300' : '#5b9cc2';
  const glassEI = hovered ? 2.0 : isDark ? 1.2 : 0.1;

  return (
    <group position={pos} rotation={rot || [0, 0, 0]}>
      {/* Glass */}
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={glassColor}
          emissive={glassEmissive}
          emissiveIntensity={glassEI}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          metalness={0.7}
          roughness={0.1}
        />
      </mesh>
      {/* Horizontal mullion */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[size[0], 0.015]} />
        <meshStandardMaterial color={hovered ? '#e6b800' : '#5c3a1e'} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Vertical mullion */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[0.015, size[1]]} />
        <meshStandardMaterial color={hovered ? '#e6b800' : '#5c3a1e'} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Window frame - top */}
      <mesh position={[0, size[1] / 2 + 0.012, 0.004]}>
        <planeGeometry args={[size[0] + 0.04, 0.025]} />
        <WoodTrim color={hovered ? '#e6b800' : '#4a2a10'} />
      </mesh>
      {/* Window frame - bottom */}
      <mesh position={[0, -(size[1] / 2 + 0.012), 0.004]}>
        <planeGeometry args={[size[0] + 0.04, 0.025]} />
        <WoodTrim color={hovered ? '#e6b800' : '#4a2a10'} />
      </mesh>
      {/* Window frame - left */}
      <mesh position={[-(size[0] / 2 + 0.012), 0, 0.004]}>
        <planeGeometry args={[0.025, size[1] + 0.05]} />
        <WoodTrim color={hovered ? '#e6b800' : '#4a2a10'} />
      </mesh>
      {/* Window frame - right */}
      <mesh position={[(size[0] / 2 + 0.012), 0, 0.004]}>
        <planeGeometry args={[0.025, size[1] + 0.05]} />
        <WoodTrim color={hovered ? '#e6b800' : '#4a2a10'} />
      </mesh>
    </group>
  );
};

/* ── Front Door ── */
const FrontDoor = ({ pos, rot, theme, hovered, height = 0.55, width = 0.28 }: any) => {
  const isDark = theme === 'night';
  const doorColor = hovered ? '#e6b800' : isDark ? '#3a2410' : '#5c3a1e';
  const frameColor = hovered ? '#d4a600' : '#3a1e08';

  return (
    <group position={pos} rotation={rot || [0, 0, 0]}>
      {/* Door frame */}
      <mesh position={[0, height / 2, -0.003]}>
        <boxGeometry args={[width + 0.06, height + 0.04, 0.03]} />
        <WoodTrim color={frameColor} />
      </mesh>
      {/* Door panel */}
      <mesh position={[0, height / 2, 0.005]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial
          color={doorColor}
          roughness={0.75}
          metalness={0.06}
          emissive={isDark ? '#331800' : '#000000'}
          emissiveIntensity={isDark ? 0.3 : 0}
        />
      </mesh>
      {/* Door panels (decorative grooves) */}
      {[-0.06, 0.06].map((x, i) => (
        <mesh key={i} position={[x, height * 0.6, 0.018]}>
          <boxGeometry args={[width * 0.35, height * 0.35, 0.005]} />
          <meshStandardMaterial color={hovered ? '#c89e00' : isDark ? '#2e1c0a' : '#4a2a10'} roughness={0.82} />
        </mesh>
      ))}
      {/* Doorknob */}
      <mesh position={[width * 0.32, height * 0.45, 0.025]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial
          color={hovered ? '#FFD700' : '#c8a830'}
          metalness={0.9}
          roughness={0.15}
          emissive={isDark ? '#ffa000' : '#000'}
          emissiveIntensity={isDark ? 1.5 : 0}
        />
      </mesh>
      {/* Door step */}
      <mesh position={[0, -0.01, 0.04]}>
        <boxGeometry args={[width + 0.12, 0.04, 0.08]} />
        <meshStandardMaterial color={hovered ? '#d4a600' : '#8a7a68'} roughness={0.9} />
      </mesh>
    </group>
  );
};

/* ── Chimney ── */
const Chimney = ({ pos, theme, hovered }: any) => {
  const isDark = theme === 'night';
  return (
    <group position={pos}>
      {/* Main chimney body */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.14, 0.4, 0.14]} />
        <meshStandardMaterial
          color={hovered ? '#FFD700' : isDark ? '#5a4a3a' : '#9a7a5a'}
          roughness={0.88}
          metalness={0.05}
        />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.18, 0.04, 0.18]} />
        <meshStandardMaterial color={hovered ? '#e6b800' : '#6a5a4a'} roughness={0.85} />
      </mesh>
      {/* Night glow from chimney */}
      {isDark && (
        <pointLight position={[0, 0.45, 0]} intensity={0.4} distance={3} color="#ff6622" />
      )}
    </group>
  );
};

/* ── MAIN HOUSE COMPONENT ── */
export const House: React.FC<HouseProps> = ({ data, readOnly }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { theme, memories, selectedBuildingId, selectBuilding, isRepositioning } = useStore();
  const memory = memories.find(m => m.id === data.id);
  const isSelected = selectedBuildingId === data.id;
  const seed = seedFromId(data.id);

  const isDark = theme === 'night';

  // House proportions based on height
  const house = useMemo(() => {
    const h = Math.max(0.8, data.height);
    const wallH = h * 0.65;
    const roofH = h * 0.4;
    const bodyW = 0.85 + (seed % 3) * 0.05;
    const bodyD = 0.7 + (seed % 2) * 0.05;
    return { wallH, roofH, bodyW, bodyD };
  }, [data.height, seed]);

  // Wall color — warm residential tones, tinted by category
  const wallColor = useMemo(() => {
    if (hovered) return '#FFD700';
    const bases = isDark
      ? ['#3a3228', '#352e24', '#3e3630', '#383024', '#342c22']
      : ['#e8dcc8', '#ddd0b8', '#e0d4c0', '#d8ccb4', '#e4d8c4'];
    return bases[seed % bases.length];
  }, [seed, isDark, hovered]);

  // Roof color — earthy tones
  const roofColor = useMemo(() => {
    if (hovered) return '#e6b800';
    const roofs = isDark
      ? ['#4a2a1a', '#3e2818', '#452c1c', '#3a2416', '#4e2e1e']
      : ['#8b4513', '#7a3e12', '#964b15', '#6e3610', '#a05218'];
    return roofs[seed % roofs.length];
  }, [seed, isDark, hovered]);

  /* ─── Animations ─── */
  useEffect(() => {
    if (!groupRef.current) return;
    if (data.isAnimating) {
      gsap.fromTo(groupRef.current.scale, { y: 0 }, { y: 1, duration: 1.5, ease: 'elastic.out(1, 0.3)' });
      gsap.fromTo(groupRef.current.position, { y: -data.height }, { y: 0, duration: 1.5, ease: 'elastic.out(1, 0.3)' });
      playFireworkSound();
      const end = Date.now() + 1000;
      const frame = () => {
        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: [data.color, '#ffffff'] });
        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: [data.color, '#ffffff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
    if (data.isDeleting) {
      playDemolishSound();
      gsap.to(groupRef.current.scale, { y: 0, duration: 0.8, ease: 'power2.in' });
      gsap.to(groupRef.current.position, { y: -data.height, duration: 0.8, ease: 'power2.in' });
    }
  }, [data.isAnimating, data.isDeleting, data.height, data.color]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (readOnly) return;
    if (!isRepositioning) selectBuilding(isSelected ? null : data.id);
  };

  const { wallH, roofH, bodyW, bodyD } = house;
  const totalH = wallH + roofH;

  // Facade category accent line
  const accentColor = data.color;

  return (
    <group
      ref={groupRef}
      position={[data.position.x, 0, data.position.z]}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Hover glow */}
      {hovered && (
        <pointLight position={[0, totalH / 2, 0]} intensity={2} distance={10} color="#FFD700" />
      )}

      {/* ── 1. Foundation/Base ── */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[bodyW + 0.12, 0.06, bodyD + 0.12]} />
        <meshStandardMaterial
          color={hovered ? '#d4a600' : isDark ? '#3a3028' : '#8a7a68'}
          roughness={0.92}
        />
      </mesh>

      {/* ── 2. Main wall body ── */}
      <mesh position={[0, wallH / 2 + 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW, wallH, bodyD]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.82}
          metalness={0.04}
          emissive={isDark ? accentColor : (isSelected ? '#ffffff' : '#000000')}
          emissiveIntensity={isDark ? 0.08 : (isSelected ? 0.15 : 0)}
        />
      </mesh>

      {/* ── 3. Corner wood trim (vertical beams) ── */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`corner-${i}`} position={[sx * bodyW / 2, wallH / 2 + 0.06, sz * bodyD / 2]} castShadow>
          <boxGeometry args={[0.04, wallH + 0.02, 0.04]} />
          <WoodTrim color={hovered ? '#d4a600' : isDark ? '#2e1c0a' : '#4a2a10'} />
        </mesh>
      ))}

      {/* ── 4. Horizontal beam (half-timber detail) ── */}
      <mesh position={[0, wallH * 0.52 + 0.06, bodyD / 2 + 0.006]}>
        <boxGeometry args={[bodyW + 0.02, 0.03, 0.02]} />
        <WoodTrim color={hovered ? '#d4a600' : isDark ? '#2e1c0a' : '#4a2a10'} />
      </mesh>
      <mesh position={[0, wallH * 0.52 + 0.06, -(bodyD / 2 + 0.006)]}>
        <boxGeometry args={[bodyW + 0.02, 0.03, 0.02]} />
        <WoodTrim color={hovered ? '#d4a600' : isDark ? '#2e1c0a' : '#4a2a10'} />
      </mesh>

      {/* ── 5. Category accent stripe (base of wall) ── */}
      <mesh position={[0, 0.08, bodyD / 2 + 0.006]}>
        <planeGeometry args={[bodyW, 0.04]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={isDark ? 1.0 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── 6. Front door ── */}
      <FrontDoor
        pos={[0, 0.06, bodyD / 2 + 0.01]}
        theme={theme}
        hovered={hovered}
        height={wallH * 0.65}
        width={bodyW * 0.28}
      />

      {/* ── 7. Windows — front (flanking door) ── */}
      <WindowPane
        pos={[bodyW * 0.32, wallH * 0.55 + 0.06, bodyD / 2 + 0.008]}
        theme={theme}
        hovered={hovered}
        size={[0.18, 0.22]}
      />
      <WindowPane
        pos={[-bodyW * 0.32, wallH * 0.55 + 0.06, bodyD / 2 + 0.008]}
        theme={theme}
        hovered={hovered}
        size={[0.18, 0.22]}
      />

      {/* ── 8. Windows — back ── */}
      <WindowPane
        pos={[bodyW * 0.22, wallH * 0.55 + 0.06, -(bodyD / 2 + 0.008)]}
        rot={[0, Math.PI, 0]}
        theme={theme}
        hovered={hovered}
        size={[0.18, 0.22]}
      />
      <WindowPane
        pos={[-bodyW * 0.22, wallH * 0.55 + 0.06, -(bodyD / 2 + 0.008)]}
        rot={[0, Math.PI, 0]}
        theme={theme}
        hovered={hovered}
        size={[0.18, 0.22]}
      />

      {/* ── 9. Windows — sides ── */}
      <WindowPane
        pos={[bodyW / 2 + 0.008, wallH * 0.55 + 0.06, 0]}
        rot={[0, Math.PI / 2, 0]}
        theme={theme}
        hovered={hovered}
        size={[0.18, 0.22]}
      />
      <WindowPane
        pos={[-(bodyW / 2 + 0.008), wallH * 0.55 + 0.06, 0]}
        rot={[0, -Math.PI / 2, 0]}
        theme={theme}
        hovered={hovered}
        size={[0.18, 0.22]}
      />

      {/* ── 10. Roof — gable/pitched ── */}
      <group position={[0, wallH + 0.06, 0]}>
        {/* Roof eave overhang */}
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[bodyW + 0.16, 0.04, bodyD + 0.16]} />
          <WoodTrim color={hovered ? '#d4a600' : isDark ? '#2e1c0a' : '#4a2a10'} />
        </mesh>

        {/* Main pitched roof — using a triangular prism approximation via extruded shape */}
        {/* We approximate with a box + rotated planes, or simply use a cone with 4 sides */}
        <mesh position={[0, roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[(bodyW + 0.08) * 0.72, roofH, 4]} />
          <meshStandardMaterial
            color={roofColor}
            roughness={0.7}
            metalness={0.12}
            emissive={isDark ? accentColor : '#000000'}
            emissiveIntensity={isDark ? 0.05 : 0}
          />
        </mesh>

        {/* Ridge cap */}
        <mesh position={[0, roofH + 0.01, 0]}>
          <boxGeometry args={[0.03, 0.03, bodyD * 0.6]} />
          <WoodTrim color={hovered ? '#d4a600' : isDark ? '#3a2a1a' : '#5c3a1e'} />
        </mesh>
      </group>

      {/* ── 11. Chimney ── */}
      {seed % 3 !== 0 && (
        <Chimney
          pos={[bodyW * 0.25, wallH + roofH * 0.3 + 0.06, bodyD * 0.1]}
          theme={theme}
          hovered={hovered}
        />
      )}

      {/* ── 12. Fascia boards (along roofline, front & back) ── */}
      <mesh position={[0, wallH + 0.06, bodyD / 2 + 0.008]}>
        <planeGeometry args={[bodyW + 0.12, 0.04]} />
        <WoodTrim color={hovered ? '#d4a600' : isDark ? '#2e1c0a' : '#4a2a10'} />
      </mesh>
      <mesh position={[0, wallH + 0.06, -(bodyD / 2 + 0.008)]}>
        <planeGeometry args={[bodyW + 0.12, 0.04]} />
        <WoodTrim color={hovered ? '#d4a600' : isDark ? '#2e1c0a' : '#4a2a10'} />
      </mesh>

      {/* ── 13. Flower box / planter (front, decorative) ── */}
      {seed % 2 === 0 && (
        <group position={[bodyW * 0.32, wallH * 0.35 + 0.06, bodyD / 2 + 0.05]}>
          <mesh>
            <boxGeometry args={[0.22, 0.06, 0.06]} />
            <meshStandardMaterial
              color={hovered ? '#d4a600' : isDark ? '#3a2a1a' : '#6a4a2a'}
              roughness={0.85}
            />
          </mesh>
          {/* Mini green bushes */}
          {[-0.06, 0, 0.06].map((x, i) => (
            <mesh key={i} position={[x, 0.05, 0]}>
              <sphereGeometry args={[0.03, 6, 6]} />
              <meshStandardMaterial
                color={hovered ? '#c8e800' : '#4a8a3a'}
                emissive={isDark ? '#2a5a1a' : '#000'}
                emissiveIntensity={isDark ? 0.4 : 0}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ── 14. Night warm interior glow ── */}
      {isDark && (
        <>
          <pointLight position={[0, wallH * 0.4, bodyD * 0.3]} intensity={0.5} distance={4} color="#ffaa44" />
          <pointLight position={[0, wallH * 0.4, -bodyD * 0.3]} intensity={0.3} distance={3} color="#ff8833" />
        </>
      )}

      {/* ── 15. Selection ring ── */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[bodyW * 0.7, bodyW * 0.82, 32]} />
          <meshBasicMaterial color="#fcd34d" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
