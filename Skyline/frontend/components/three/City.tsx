'use client';

import React, { useMemo, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Building } from './Building';
import { Castle } from './Castle';
import { ThreeEvent } from '@react-three/fiber';

export const City: React.FC = () => {
  const buildings = useStore(s => s.buildings);
  const gridSize = useStore(s => s.gridSize);
  const isRepositioning = useStore(s => s.isRepositioning);
  const repositioningBuildingId = useStore(s => s.repositioningBuildingId);
  const previewPosition = useStore(s => s.previewPosition);
  const selectedBuildingId = useStore(s => s.selectedBuildingId);
  const theme = useStore(s => s.theme);
  const setPreviewPosition = useStore(s => s.setPreviewPosition);
  const commitReposition = useStore(s => s.commitReposition);
  const isTileValidForReposition = useStore(s => s.isTileValidForReposition);
  const timelineActive = useStore(s => s.timelineActive);
  const timelinePercent = useStore(s => s.timelinePercent);
  const memories = useStore(s => s.memories);

  // When timeline is active, compute which buildings are visible based on construction order
  const visibleIds = useMemo(() => {
    if (!timelineActive) return null;
    // Sort memories by createdAt (construction order)
    const sorted = [...memories].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const total = sorted.length;
    const visibleCount = Math.round((timelinePercent / 100) * total);
    return new Set(sorted.slice(0, visibleCount).map(m => m.id));
  }, [timelineActive, timelinePercent, memories]);

  const groundColor = theme === 'day' ? '#5cb85c' : '#1a4d1a';
  const occupiedColor = theme === 'day' ? '#8a8a8a' : '#4a4a4a';
  const validColor = '#7ecfff';   // light blue
  const invalidColor = '#ff8a8a'; // light red
  const previewColor = '#5bc0de'; // current hover preview

  // For drag: track if pointer is down on the ground during repositioning
  const isDragging = useRef(false);

  const tiles = useMemo(() => {
    const grid = [];
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const isOccupied = buildings.some(b => b.position.x === x && b.position.z === z);
        // Which building sits here (if any)?
        const occupantId = buildings.find(b => b.position.x === x && b.position.z === z)?.id || null;
        grid.push({ x, z, isOccupied, occupantId });
      }
    }
    return grid;
  }, [buildings, gridSize]);

  // Precompute valid tiles for the building being repositioned
  const validTileSet = useMemo(() => {
    if (!isRepositioning || !repositioningBuildingId) return new Set<string>();
    const s = new Set<string>();
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        if (isTileValidForReposition(x, z)) {
          s.add(`${x},${z}`);
        }
      }
    }
    return s;
  }, [isRepositioning, repositioningBuildingId, buildings, gridSize]);

  const getTileColor = useCallback((tile: { x: number; z: number; isOccupied: boolean; occupantId: string | null }) => {
    if (!isRepositioning) {
      return tile.isOccupied ? occupiedColor : groundColor;
    }
    // During repositioning
    // If this is the tile currently previewed, highlight it
    if (previewPosition && previewPosition.x === tile.x && previewPosition.z === tile.z) {
      const key = `${tile.x},${tile.z}`;
      return validTileSet.has(key) ? previewColor : invalidColor;
    }
    // If tile is occupied by the building being moved, show as valid (it can stay)
    if (tile.occupantId === repositioningBuildingId) {
      return validColor;
    }
    // Valid/invalid
    const key = `${tile.x},${tile.z}`;
    return validTileSet.has(key) ? validColor : invalidColor;
  }, [isRepositioning, previewPosition, validTileSet, repositioningBuildingId, occupiedColor, groundColor]);

  const handleTilePointerMove = useCallback((x: number, z: number) => {
    if (isRepositioning && isDragging.current) {
      setPreviewPosition({ x, z });
    }
  }, [isRepositioning, setPreviewPosition]);

  const handleTileClick = useCallback((x: number, z: number) => {
    if (isRepositioning && repositioningBuildingId) {
      setPreviewPosition({ x, z });
    }
  }, [isRepositioning, repositioningBuildingId, setPreviewPosition]);

  // Handle pointer down on ground to start drag
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (isRepositioning) {
      isDragging.current = true;
      e.stopPropagation();
    }
  }, [isRepositioning]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <group
      position={[-gridSize / 2 + 0.5, 0, -gridSize / 2 + 0.5]}
      onPointerUp={handlePointerUp}
    >
      {/* Floor Tiles */}
      {tiles.map((tile) => (
        <mesh 
            key={`${tile.x}-${tile.z}`} 
            position={[tile.x, -0.05, tile.z]} 
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
                e.stopPropagation();
                handleTileClick(tile.x, tile.z);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={(e) => {
                if (isRepositioning) {
                  e.stopPropagation();
                  handleTilePointerMove(tile.x, tile.z);
                }
            }}
        >
          <planeGeometry args={[0.95, 0.95]} />
          <meshPhysicalMaterial 
            color={getTileColor(tile)} 
            roughness={0.8}
            emissive={isRepositioning ? (validTileSet.has(`${tile.x},${tile.z}`) ? '#ffffff' : '#000000') : '#000000'}
            emissiveIntensity={isRepositioning ? 0.15 : 0}
          />
        </mesh>
      ))}

      {/* Buildings & Castles */}
      {buildings
        .filter(b => !visibleIds || visibleIds.has(b.id))
        .map((b) => (
        b.isCore ? (
          <Castle key={b.id} data={b} />
        ) : (
          <Building key={b.id} data={b} />
        )
      ))}
    </group>
  );
};
