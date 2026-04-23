import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useStore, Building as BuildingType } from '@/store/useStore';
import * as THREE from 'three';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { playFireworkSound, playDemolishSound } from '@/lib/sounds';

interface CastleProps { data: BuildingType; }

const getCategoryColor = (cat: string) =>
  ({ career:'#3b82f6', health:'#ec4899', relationships:'#10b981', personal:'#f59e0b', other:'#eab308' }[cat] ?? '#eab308');

/* ── helpers ─────────────────────────────────────────────── */
const Stone = ({ color, roughness = 0.92, metalness = 0.04, emissive = '#000', emissiveIntensity = 0 }: any) => (
  <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive} emissiveIntensity={emissiveIntensity} />
);
const SlateRoof = ({ color = '#3d4a5c' }: any) => (
  <meshStandardMaterial color={color} roughness={0.65} metalness={0.18} />
);

/* ── CORNER TOWER (highly detailed) ─────────────────────── */
const CornerTower = ({ pos, H, R, stone, stoneDark, catColor, theme, hovered }: any) => {
  stone     = hovered ? '#FFD700' : stone;
  stoneDark = hovered ? '#e6b800' : stoneDark;
  const segs = 24;
  const isDark = theme === 'night';
  const slits = Math.max(3, Math.floor(H / 2.2));
  const winColor  = isDark ? '#ffe082' : '#5a8ab5';
  const winEI     = isDark ? 1.4 : 0.1;

  // Decorative string-course Y positions (1/4, 1/2, 3/4 height)
  const bands = [0.25, 0.5, 0.75];

  return (
    <group position={pos}>
      {/* ━━ Plinth / battered base ━━ */}
      <mesh position={[0, 0.10, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R * 1.52, R * 1.68, 0.20, segs]} />
        <Stone color={stoneDark} />
      </mesh>
      <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R * 1.32, R * 1.52, 0.24, segs]} />
        <Stone color={stoneDark} />
      </mesh>

      {/* ━━ Main shaft ━━ */}
      <mesh position={[0, H / 2 + 0.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R * 1.06, H, segs]} />
        <Stone color={stone} emissive={isDark ? catColor : '#000'} emissiveIntensity={isDark ? 0.07 : 0} />
      </mesh>

      {/* ━━ Decorative string courses ━━ */}
      {bands.map((t, i) => (
        <React.Fragment key={i}>
          {/* Main torus band */}
          <mesh position={[0, 0.38 + H * t, 0]}>
            <torusGeometry args={[R + 0.02, 0.04, 8, segs]} />
            <Stone color={stoneDark} roughness={0.93} />
          </mesh>
          {/* Shadow reveal line below */}
          <mesh position={[0, 0.38 + H * t - 0.055, 0]}>
            <torusGeometry args={[R + 0.005, 0.015, 6, segs]} />
            <Stone color={isDark ? '#1a1208' : '#6a5a48'} roughness={0.97} />
          </mesh>
        </React.Fragment>
      ))}

      {/* ━━ Arrow slits with stone surrounds ━━ */}
      {Array.from({ length: slits }).map((_, i) => {
        const a = (i / slits) * Math.PI * 2 + 0.4;
        const rx = Math.cos(a), rz = Math.sin(a);
        const y = 0.6 + H * 0.15 + (i / slits) * H * 0.52;
        return (
          <group key={i} position={[rx * (R + 0.012), y, rz * (R + 0.012)]} rotation={[0, -a, 0]}>
            {/* Dark slit */}
            <mesh>
              <planeGeometry args={[0.06, 0.34]} />
              <meshStandardMaterial color={isDark ? '#ff8800' : '#080808'} emissive={isDark ? '#ff4400' : '#000'} emissiveIntensity={isDark ? 0.6 : 0} side={THREE.DoubleSide} />
            </mesh>
            {/* Stone lintel above slit */}
            <mesh position={[0, 0.20, 0.015]}>
              <boxGeometry args={[0.12, 0.04, 0.03]} />
              <Stone color={stoneDark} roughness={0.92} />
            </mesh>
            {/* Stone sill below slit */}
            <mesh position={[0, -0.19, 0.018]}>
              <boxGeometry args={[0.14, 0.04, 0.04]} />
              <Stone color={stoneDark} roughness={0.92} />
            </mesh>
          </group>
        );
      })}

      {/* ━━ Paired windows at upper 2/3 (every other level) ━━ */}
      {[0.42, 0.68].map((yt, yi) => (
        Array.from({ length: 2 }).map((_, wi) => {
          const a = wi * Math.PI + Math.PI / 4; // 2 windows 180° apart on tower
          const rx = Math.cos(a), rz = Math.sin(a);
          const y = 0.38 + H * yt;
          return (
            <group key={`win-${yi}-${wi}`} position={[rx * (R + 0.013), y, rz * (R + 0.013)]} rotation={[0, -a, 0]}>
              {/* Glass */}
              <mesh>
                <planeGeometry args={[0.18, 0.30]} />
                <meshStandardMaterial color={winColor} emissive={winColor} emissiveIntensity={winEI} side={THREE.DoubleSide} transparent opacity={0.80} />
              </mesh>
              {/* Stone arch header */}
              <mesh position={[0, 0.18, 0.012]}>
                <planeGeometry args={[0.24, 0.05]} />
                <Stone color={stoneDark} roughness={0.92} />
              </mesh>
              {/* Sill */}
              <mesh position={[0, -0.17, 0.014]}>
                <planeGeometry args={[0.22, 0.04]} />
                <Stone color={stoneDark} roughness={0.92} />
              </mesh>
              {/* Side jambs */}
              {[-0.1, 0.1].map((ox, ji) => (
                <mesh key={ji} position={[ox, 0, 0.01]}>
                  <planeGeometry args={[0.03, 0.30]} />
                  <Stone color={stoneDark} roughness={0.92} />
                </mesh>
              ))}
            </group>
          );
        })
      ))}

      {/* ━━ Individual corbel brackets (12 around) ━━ */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (R + 0.04), H + 0.28, Math.sin(a) * (R + 0.04)]} rotation={[0.3, -a, 0]} castShadow>
            <boxGeometry args={[0.11, 0.22, 0.16]} />
            <Stone color={stoneDark} />
          </mesh>
        );
      })}

      {/* ━━ Corbel table ring ━━ */}
      <mesh position={[0, H + 0.50, 0]} castShadow>
        <cylinderGeometry args={[R + 0.18, R + 0.06, 0.18, segs]} />
        <Stone color={stoneDark} />
      </mesh>
      {/* Battlement walkway slab */}
      <mesh position={[0, H + 0.60, 0]}>
        <cylinderGeometry args={[R + 0.18, R + 0.18, 0.06, segs]} />
        <Stone color={stone} />
      </mesh>

      {/* ━━ Merlons (12, alternating) ━━ */}
      {Array.from({ length: 12 }).map((_, i) => {
        if (i % 2 !== 0) return null;
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (R + 0.06), H + 0.86, Math.sin(a) * (R + 0.06)]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.16, 0.40, 0.15]} />
            <Stone color={stone} />
          </mesh>
        );
      })}

      {/* ━━ Conical roof with lead flashing drip mold ━━ */}
      {/* Drip mold ring at base of cone */}
      <mesh position={[0, H + 0.68, 0]}>
        <torusGeometry args={[R + 0.20, 0.04, 6, segs]} />
        <meshStandardMaterial color="#707070" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Main cone */}
      <mesh position={[0, H + 0.68 + H * 0.22, 0]} castShadow>
        <coneGeometry args={[R + 0.18, H * 0.44, segs]} />
        <meshStandardMaterial color={isDark ? '#283040' : '#3d4a5c'} roughness={0.60} metalness={0.22} />
      </mesh>
      {/* Upper cone trim ring */}
      <mesh position={[0, H + 0.68 + H * 0.34, 0]}>
        <torusGeometry args={[R * 0.65, 0.025, 5, segs]} />
        <meshStandardMaterial color="#606060" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* ━━ Roof finial & flag ━━ */}
      {/* Spire pole */}
      <mesh position={[0, H + 0.68 + H * 0.44 + 0.14, 0]}>
        <cylinderGeometry args={[0.022, 0.05, 0.28, 6]} />
        <meshStandardMaterial color={isDark ? '#c8a820' : '#8a7020'} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Gold orb */}
      <mesh position={[0, H + 0.68 + H * 0.44 + 0.30, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color={isDark ? '#ffd700' : '#c09820'} emissive={isDark ? '#ffa000' : '#000'} emissiveIntensity={isDark ? 2.0 : 0} metalness={0.92} roughness={0.1} />
      </mesh>

      {/* ━━ Night torch sconces ━━ */}
      {isDark && [0, Math.PI].map((a, i) => (
        <group key={i} position={[Math.cos(a) * (R + 0.08), H * 0.55, Math.sin(a) * (R + 0.08)]}>
          {/* Sconce bracket */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.2, 5]} />
            <meshStandardMaterial color="#4a3218" roughness={0.8} />
          </mesh>
          {/* Flame */}
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff4400" emissiveIntensity={3.5} />
          </mesh>
          <pointLight position={[0, 0.22, 0]} intensity={0.7} distance={5} color="#ff7722" />
        </group>
      ))}

      {isDark && (
        <pointLight position={[0, H * 0.5, 0]} intensity={0.9} distance={7} color="#ff8833" />
      )}
    </group>
  );
};

/* ── CURTAIN WALL ────────────────────────────────────────── */
const Wall = ({ from, to, H, T, stone, stoneDark, hovered }: any) => {
  stone     = hovered ? '#FFD700' : stone;
  stoneDark = hovered ? '#e6b800' : stoneDark;
  const dx = to[0] - from[0], dz = to[2] - from[2];
  const L = Math.sqrt(dx * dx + dz * dz);
  const mx = (from[0] + to[0]) / 2, mz = (from[2] + to[2]) / 2;
  const angle = Math.atan2(dz, dx);
  const merlons = Math.max(3, Math.floor(L / 0.55));

  return (
    <group>
      {/* Wall body */}
      <mesh position={[mx, H / 2, mz]} rotation={[0, -angle + Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[T, H, L]} />
        <Stone color={stone} />
      </mesh>
      {/* Coping / wallwalk */}
      <mesh position={[mx, H + 0.04, mz]} rotation={[0, -angle + Math.PI / 2, 0]}>
        <boxGeometry args={[T + 0.1, 0.08, L + 0.04]} />
        <Stone color={stoneDark} />
      </mesh>
      {/* Stone banding */}
      {[0.3, 0.65].map((t, i) => (
        <mesh key={i} position={[mx, H * t, mz]} rotation={[0, -angle + Math.PI / 2, 0]}>
          <boxGeometry args={[T + 0.04, 0.05, L + 0.02]} />
          <Stone color={stoneDark} />
        </mesh>
      ))}
      {/* Merlons */}
      {Array.from({ length: merlons }).map((_, i) => {
        if (i % 2 !== 0) return null;
        const t = (i + 0.5) / merlons;
        return (
          <mesh key={i} position={[from[0] + dx * t, H + 0.22, from[2] + dz * t]} castShadow>
            <boxGeometry args={[0.21, 0.44, 0.21]} />
            <Stone color={stone} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ── GATEHOUSE ───────────────────────────────────────────── */
const Gatehouse = ({ pos, H, W, stone, stoneDark, theme, hovered }: any) => {
  stone     = hovered ? '#FFD700' : stone;
  stoneDark = hovered ? '#e6b800' : stoneDark;
  const isDark = theme === 'night';
  const woodColor = isDark ? '#3a2410' : '#5c3a1e';
  return (
    <group position={pos}>
      {/* Two flanking towers */}
      {[-W * 0.38, W * 0.38].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, H * 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[W * 0.38, H * 1.2, 0.52]} />
            <Stone color={stone} />
          </mesh>
          <mesh position={[0, H * 1.2 + 0.04, 0]}>
            <boxGeometry args={[W * 0.38 + 0.08, 0.08, 0.6]} />
            <Stone color={stoneDark} />
          </mesh>
          {/* Merlons on flanking towers */}
          {[-1, 0, 1].map((j) => (
            <mesh key={j} position={[j * W * 0.12, H * 1.2 + 0.28, 0]} castShadow>
              <boxGeometry args={[0.13, 0.36, 0.18]} />
              <Stone color={stone} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Main gate arch */}
      <mesh position={[0, H * 0.35, 0.27]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.55, H * 0.7, 0.06]} />
        <meshStandardMaterial color={isDark ? '#0a0a0a' : '#111'} emissive={isDark ? '#220800' : '#000'} emissiveIntensity={isDark ? 0.3 : 0} />
      </mesh>

      {/* Wooden gate */}
      <mesh position={[0, H * 0.28, 0.30]}>
        <boxGeometry args={[W * 0.48, H * 0.55, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.88} metalness={0.06} />
      </mesh>

      {/* Iron studs */}
      {[-1, 0, 1].flatMap(row => [-1, 1].map(col => (
        <mesh key={`${row}${col}`} position={[col * W * 0.14, H * 0.18 + row * H * 0.11, 0.325]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#444" metalness={0.9} roughness={0.3} />
        </mesh>
      )))}

      {/* Portcullis */}
      {isDark && [...Array(5)].map((_, i) => (
        <mesh key={i} position={[(i - 2) * W * 0.1, H * 0.35, 0.34]}>
          <cylinderGeometry args={[0.013, 0.013, H * 0.6, 5]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* Gate torches */}
      {isDark && [-W * 0.3, W * 0.3].map((x, i) => (
        <group key={i} position={[x, H * 0.6, 0.32]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
            <meshStandardMaterial color="#6b4226" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff4400" emissiveIntensity={3} />
          </mesh>
          <pointLight position={[0, 0.38, 0]} intensity={0.8} distance={4} color="#ff7722" />
        </group>
      ))}
    </group>
  );
};

/* ── CENTRAL KEEP ────────────────────────────────────────── */
const Keep = ({ H, W, stone, stoneDark, catColor, theme, hovered }: any) => {
  stone     = hovered ? '#FFD700' : stone;
  stoneDark = hovered ? '#e6b800' : stoneDark;
  const isDark = theme === 'night';
  const winColor = isDark ? '#ffe082' : '#5a8ab5';
  const winEI = isDark ? 1.6 : 0.1;
  const floors = Math.max(2, Math.floor(H / 2.5));

  const faces = [
    { dir: [0, 0, 1], rot: 0 },
    { dir: [0, 0, -1], rot: Math.PI },
    { dir: [1, 0, 0], rot: -Math.PI / 2 },
    { dir: [-1, 0, 0], rot: Math.PI / 2 },
  ];

  return (
    <group>
      {/* Keep body */}
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, W]} />
        <Stone color={stone} emissive={isDark ? catColor : '#000'} emissiveIntensity={isDark ? 0.12 : 0} />
      </mesh>

      {/* Vertical pilasters (corner buttresses) */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (W / 2 + 0.04), H / 2, sz * (W / 2 + 0.04)]} castShadow>
          <boxGeometry args={[0.14, H + 0.1, 0.14]} />
          <Stone color={stoneDark} roughness={0.9} />
        </mesh>
      ))}

      {/* Horizontal stone courses */}
      {Array.from({ length: Math.max(1, Math.floor(H / 2)) }).map((_, i) => (
        <mesh key={i} position={[0, (i + 1) * 2, 0]}>
          <boxGeometry args={[W + 0.06, 0.05, W + 0.06]} />
          <Stone color={stoneDark} />
        </mesh>
      ))}

      {/* Gothic pointed-arch windows — 2 per side per floor */}
      {faces.flatMap(({ dir, rot }) =>
        Array.from({ length: floors }).flatMap((_, fl) => {
          const y = ((fl + 0.55) / floors) * H;
          const off = W / 2 + 0.012;
          return [-0.55, 0.55].map((wx, wi) => (
            <group key={`${rot}-${fl}-${wi}`} position={[dir[0] * off, y, dir[2] * off]} rotation={[0, rot, 0]}>
              {/* Window glass */}
              <mesh position={[wx, 0, 0]}>
                <planeGeometry args={[0.24, 0.46]} />
                <meshStandardMaterial color={winColor} emissive={winColor} emissiveIntensity={winEI} side={THREE.DoubleSide} transparent opacity={0.82} />
              </mesh>
              {/* Stone arch lintel */}
              <mesh position={[wx, 0.27, 0.008]}>
                <planeGeometry args={[0.3, 0.05]} />
                <Stone color={stoneDark} roughness={0.92} />
              </mesh>
              {/* Stone sill */}
              <mesh position={[wx, -0.26, 0.008]}>
                <planeGeometry args={[0.3, 0.045]} />
                <Stone color={stoneDark} roughness={0.92} />
              </mesh>
              {/* Mullion divider between window pair (only on wi=0) */}
              {wi === 0 && (
                <mesh position={[0.27, 0, 0.006]}>
                  <planeGeometry args={[0.04, 0.5]} />
                  <Stone color={stoneDark} roughness={0.92} />
                </mesh>
              )}
            </group>
          ));
        })
      )}

      {/* Corbel table */}
      <mesh position={[0, H + 0.12, 0]}>
        <boxGeometry args={[W + 0.22, 0.24, W + 0.22]} />
        <Stone color={stoneDark} />
      </mesh>

      {/* Battlements */}
      {Array.from({ length: 16 }).map((_, i) => {
        if (i % 2 !== 0) return null;
        const side = Math.floor(i / 4);
        const t = ((i % 4) + 0.5) / 4;
        const hw = W / 2 + 0.1;
        const positions: [number, number, number][] = [
          [-hw + t * W * 0.9, H + 0.38, hw],
          [-hw + t * W * 0.9, H + 0.38, -hw],
          [hw, H + 0.38, -hw + t * W * 0.9],
          [-hw, H + 0.38, -hw + t * W * 0.9],
        ];
        return (
          <mesh key={i} position={positions[side]} castShadow>
            <boxGeometry args={[0.2, 0.46, 0.2]} />
            <Stone color={stone} />
          </mesh>
        );
      })}

      {/* Four-sided pyramid roof */}
      <mesh position={[0, H + 0.26 + H * 0.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[W * 0.75, H * 0.2, 4]} />
        <SlateRoof color={isDark ? '#2c3645' : '#3d4a5c'} />
      </mesh>

      {/* Central spire */}
      <mesh position={[0, H + 0.26 + H * 0.2 + 0.3, 0]}>
        <cylinderGeometry args={[0.04, 0.09, 0.55, 8]} />
        <meshStandardMaterial color={isDark ? '#c0a830' : '#8a7428'} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 0.26 + H * 0.2 + 0.6, 0]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial color={isDark ? '#ffd700' : '#c09820'} emissive={isDark ? '#ffa000' : '#000'} emissiveIntensity={isDark ? 2 : 0} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Night banner torch at top */}
      {isDark && (
        <pointLight position={[0, H + 0.26 + H * 0.2, 0]} intensity={1.5} distance={12} color="#ffaa33" />
      )}
    </group>
  );
};

/* ── MAIN CASTLE ─────────────────────────────────────────── */
export const Castle: React.FC<CastleProps> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { theme, memories, selectedBuildingId, selectBuilding, isRepositioning } = useStore();
  const memory = memories.find(m => m.id === data.id);
  const isSelected = selectedBuildingId === data.id;

  const { wallH, towerH, keepH } = useMemo(() => ({
    wallH:   data.height * 0.30,
    towerH:  data.height * 0.60,
    keepH:   data.height,
  }), [data.height]);

  const catColor = getCategoryColor(memory?.category || 'other');
  const isDark = theme === 'night';

  // Aged stone — slightly varied between day/night
  const stone     = isDark ? '#504538' : '#b0a090';
  const stoneDark = isDark ? '#3a3028' : '#857868';
  const offset = 2.3;

  useEffect(() => {
    if (!groupRef.current) return;
    if (data.isAnimating) {
      gsap.fromTo(groupRef.current.scale, { y: 0 }, { y: 1, duration: 2, ease: 'elastic.out(1, 0.4)' });
      gsap.fromTo(groupRef.current.position, { y: -20 }, { y: 0, duration: 2, ease: 'elastic.out(1, 0.4)' });
      playFireworkSound();
      setTimeout(() => confetti({ particleCount: 55, angle: 90, spread: 100, origin: { x: 0.5, y: 0.8 }, colors: [catColor, '#fff'] }), 500);
    }
    if (data.isDeleting) {
      playDemolishSound();
      gsap.to(groupRef.current.scale, { y: 0, duration: 1, ease: 'power2.in' });
      gsap.to(groupRef.current.position, { y: -20, duration: 1, ease: 'power2.in' });
    }
  }, [data.isAnimating, data.isDeleting, catColor]);

  return (
    <group
      position={[data.position.x, 0, data.position.z]}
      ref={groupRef}
      onClick={e => { e.stopPropagation(); if (!isRepositioning) selectBuilding(isSelected ? null : data.id); }}
      onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={e => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
    >


      {/* ── Foundation platform ── */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[5.8, 0.08, 5.8]} />
        <Stone color={isDark ? '#28221a' : '#8a7a68'} roughness={0.97} />
      </mesh>
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.3, 5.4]} />
        <Stone color={stoneDark} />
      </mesh>
      {/* Flagstone detail lines */}
      {[-1.2, 0, 1.2].map(x => [-1.2, 0, 1.2].map(z => (
        <mesh key={`${x}${z}`} position={[x, 0.37, z]}>
          <boxGeometry args={[1.1, 0.012, 1.1]} />
          <Stone color={isDark ? '#2a2018' : '#9a8a78'} roughness={0.98} />
        </mesh>
      )))}

      {/* ── Corner towers ── */}
      {[[-offset, -offset], [-offset, offset], [offset, -offset], [offset, offset]].map(([x, z], i) => (
        <CornerTower key={i} pos={[x, 0.36, z]} H={towerH} R={0.65} stone={stone} stoneDark={stoneDark} catColor={catColor} theme={theme} hovered={hovered} />
      ))}

      {/* ── Curtain walls ── */}
      <Wall from={[-offset, 0, -offset]} to={[offset, 0, -offset]}  H={wallH} T={0.36} stone={stone} stoneDark={stoneDark} hovered={hovered} />
      <Wall from={[-offset, 0,  offset]} to={[offset, 0,  offset]}  H={wallH} T={0.36} stone={stone} stoneDark={stoneDark} hovered={hovered} />
      <Wall from={[-offset, 0, -offset]} to={[-offset, 0, offset]}  H={wallH} T={0.36} stone={stone} stoneDark={stoneDark} hovered={hovered} />
      <Wall from={[offset,  0, -offset]} to={[offset,  0, offset]}  H={wallH} T={0.36} stone={stone} stoneDark={stoneDark} hovered={hovered} />

      {/* ── Gatehouse (front) ── */}
      <Gatehouse pos={[0, 0.36, -offset]} H={wallH * 0.95} W={1.8} stone={stone} stoneDark={stoneDark} theme={theme} hovered={hovered} />

      {/* ── Central keep ── */}
      <group position={[0, 0.36, 0]}>
        <Keep H={keepH} W={2.8} stone={stone} stoneDark={stoneDark} catColor={catColor} theme={theme} hovered={hovered} />
      </group>
      {hovered && (
        <pointLight position={[0, keepH * 0.5, 0]} intensity={3} distance={18} color="#FFD700" />
      )}

      {/* ── Courtyard details ── */}
      {/* Well */}
      <group position={[1.1, 0.36, 0.9]}>
        <mesh position={[0, 0.18, 0]} receiveShadow>
          <cylinderGeometry args={[0.22, 0.28, 0.36, 14]} />
          <Stone color={stoneDark} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <torusGeometry args={[0.24, 0.04, 6, 14]} />
          <Stone color={stone} />
        </mesh>
      </group>
      {/* Haybale */}
      <mesh position={[-1.1, 0.45, 0.7]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.45, 10]} />
        <meshStandardMaterial color="#b8960a" roughness={0.9} />
      </mesh>

      {/* ── Selection ring ── */}
      {isSelected && (
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.7, 2.95, 40]} />
          <meshBasicMaterial color="#fcd34d" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
