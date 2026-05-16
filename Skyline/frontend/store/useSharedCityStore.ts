import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  Memory, MemoryCategory, Building, CityUser, Vector3Position,
  CATEGORY_COLORS, getCategoryColor, computeHeight,
} from './useStore';

/* ─── Types ─── */

export interface SharedCityInfo {
  id: string;
  userA: string;
  userB: string;
  cityName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdBy: string;
  createdAt: string;
  partnerName?: string;
  partnerAvatar?: string;
  memoryCount?: number;
}

export interface CreatorInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

interface MemoryInput {
  title: string;
  caption?: string;
  category: MemoryCategory;
  impact: number;
  fondness: number;
  date: Date;
  image?: File;
  isCore?: boolean;
}

/* ─── State ─── */

interface SharedCityState {
  sharedCityId: string | null;
  cityName: string;
  partnerProfile: CreatorInfo | null;
  currentUserProfile: CreatorInfo | null;
  memories: Memory[];
  buildings: Building[];
  gridSize: number;
  selectedBuildingId: string | null;
  isRepositioning: boolean;
  repositioningBuildingId: string | null;
  previewPosition: { x: number; z: number } | null;
  isLoading: boolean;
  theme: 'day' | 'night';
  timelineActive: boolean;
  timelinePercent: number;
  npcUsers: CityUser[];
  selectedNPCId: string | null;
  isUserModalOpen: boolean;
  customCategoryColors: Record<string, string>;
  creatorMap: Record<string, CreatorInfo>;
  realtimeChannel: any;
}

interface SharedCityActions {
  initSharedCity: (cityId: string) => Promise<boolean>;
  cleanup: () => void;
  fetchSharedMemories: () => Promise<void>;
  addMemory: (input: MemoryInput) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  repositionBuilding: (buildingId: string, newPos: Vector3Position) => Promise<void>;
  selectBuilding: (id: string | null) => void;
  expandGrid: () => void;
  startRepositioning: (buildingId: string) => void;
  cancelRepositioning: () => void;
  setPreviewPosition: (pos: { x: number; z: number } | null) => void;
  commitReposition: () => Promise<void>;
  isTileValidForReposition: (x: number, z: number) => boolean;
  toggleTheme: () => void;
  setTimelineActive: (active: boolean) => void;
  setTimelinePercent: (percent: number) => void;
  getVisibleBuildingIds: () => Set<string>;
  fetchNPCUsers: () => Promise<void>;
  addNPCUser: (input: { name: string; description: string; gender: 'male' | 'female' }) => Promise<void>;
  removeNPCUser: (id: string) => Promise<void>;
  updateNPCColor: (id: string, color: string) => Promise<void>;
  selectNPC: (id: string | null) => void;
  setUserModalOpen: (open: boolean) => void;
  tickNPCMovement: (delta: number) => void;
  setCustomCategoryColor: (category: MemoryCategory, color: string) => void;
  resetCustomCategoryColors: () => void;
  applyCustomColorsToBuildings: () => void;
  setDeleting: (id: string, val: boolean) => void;
}

export type SharedCityStore = SharedCityState & SharedCityActions;

/* ─── Helpers (mirrored from useStore) ─── */

function loadCustomColors(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { const s = localStorage.getItem('skyline_shared_custom_colors'); return s ? JSON.parse(s) : {}; } catch { return {}; }
}
function saveCustomColors(c: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('skyline_shared_custom_colors', JSON.stringify(c)); } catch {}
}

function isValidPosition(pos: { x: number; z: number }, buildings: Building[], isCore: boolean, gridSize: number) {
  const reqSize = isCore ? 7 : 2;
  const half = Math.floor(reqSize / 2);
  if (pos.x - half < 0 || pos.x + half >= gridSize) return false;
  if (pos.z - half < 0 || pos.z + half >= gridSize) return false;
  return !buildings.some(b => {
    const bSize = b.isCore ? 7 : 2;
    return Math.abs(b.position.x - pos.x) < (reqSize + bSize) / 2 && Math.abs(b.position.z - pos.z) < (reqSize + bSize) / 2;
  });
}

function findValidPosition(buildings: Building[], gridSize: number, isCore = false) {
  const half = Math.floor(gridSize / 2);
  const positions: { x: number; z: number; dist: number }[] = [];
  for (let x = 0; x < gridSize; x++)
    for (let z = 0; z < gridSize; z++)
      positions.push({ x, z, dist: Math.sqrt((x - half) ** 2 + (z - half) ** 2) });
  positions.sort((a, b) => a.dist - b.dist);
  for (const pos of positions) if (isValidPosition(pos, buildings, isCore, gridSize)) return { x: pos.x, z: pos.z };
  return null;
}

function findNPCSpawn(buildings: Building[], npcs: CityUser[], gridSize: number) {
  for (let i = 0; i < 50; i++) {
    const x = 0.5 + Math.random() * (gridSize - 1);
    const z = 0.5 + Math.random() * (gridSize - 1);
    const blocked = buildings.some(b => {
      const fp = b.isCore ? 5 : 1; const h = fp / 2 + 0.5;
      return x >= b.position.x - h && x <= b.position.x + h && z >= b.position.z - h && z <= b.position.z + h;
    });
    if (!blocked) return { x, z };
  }
  return { x: gridSize / 2, z: gridSize / 2 };
}

/* ─── Store ─── */

export const useSharedCityStore = create<SharedCityStore>((set, get) => ({
  sharedCityId: null, cityName: '', partnerProfile: null, currentUserProfile: null,
  memories: [], buildings: [], gridSize: 5, selectedBuildingId: null,
  isRepositioning: false, repositioningBuildingId: null, previewPosition: null,
  isLoading: false, theme: 'night', timelineActive: false, timelinePercent: 100,
  npcUsers: [], selectedNPCId: null, isUserModalOpen: false,
  customCategoryColors: loadCustomColors(), creatorMap: {}, realtimeChannel: null,

  initSharedCity: async (cityId) => {
    set({ isLoading: true, sharedCityId: cityId });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { set({ isLoading: false }); return false; }

    const { data: city, error } = await supabase.from('shared_cities').select('*').eq('id', cityId).single();
    if (error || !city) { set({ isLoading: false }); return false; }
    if (city.user_a !== session.user.id && city.user_b !== session.user.id) { set({ isLoading: false }); return false; }
    if (city.status !== 'accepted') { set({ isLoading: false }); return false; }

    const partnerId = city.user_a === session.user.id ? city.user_b : city.user_a;
    const { data: partnerP } = await supabase.from('profiles').select('*').eq('id', partnerId).single();
    const { data: myP } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

    set({
      cityName: city.city_name,
      partnerProfile: partnerP ? { userId: partnerP.id, displayName: partnerP.display_name || partnerP.username || '', avatarUrl: partnerP.avatar_url } : null,
      currentUserProfile: myP ? { userId: myP.id, displayName: myP.display_name || myP.username || '', avatarUrl: myP.avatar_url } : null,
    });

    await get().fetchSharedMemories();
    await get().fetchNPCUsers();

    // Setup realtime
    const channel = supabase.channel(`shared-city-${cityId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_memories', filter: `shared_city_id=eq.${cityId}` },
        (payload) => {
          const uid = session.user.id;
          if (payload.eventType === 'INSERT' && (payload.new as any).created_by !== uid) get().fetchSharedMemories();
          if (payload.eventType === 'DELETE') get().fetchSharedMemories();
          if (payload.eventType === 'UPDATE' && (payload.new as any).created_by !== uid) get().fetchSharedMemories();
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_city_users', filter: `shared_city_id=eq.${cityId}` },
        () => get().fetchNPCUsers())
      .subscribe();

    set({ realtimeChannel: channel, isLoading: false });
    return true;
  },

  cleanup: () => {
    const ch = get().realtimeChannel;
    if (ch) supabase.removeChannel(ch);
    set({ realtimeChannel: null, sharedCityId: null, memories: [], buildings: [], npcUsers: [], creatorMap: {} });
  },

  fetchSharedMemories: async () => {
    const { sharedCityId } = get();
    if (!sharedCityId) return;
    set({ isLoading: true });

    const { data, error } = await supabase.from('shared_memories').select('*').eq('shared_city_id', sharedCityId).order('created_at', { ascending: true });
    if (error) { console.error('Error fetching shared memories:', error.message); set({ isLoading: false }); return; }

    // Build creator map
    const creatorIds = new Set((data || []).map((m: any) => m.created_by));
    const newMap: Record<string, CreatorInfo> = { ...get().creatorMap };
    for (const cid of creatorIds) {
      if (!newMap[cid]) {
        const { data: p } = await supabase.from('profiles').select('id, display_name, username, avatar_url').eq('id', cid).single();
        if (p) newMap[cid] = { userId: p.id, displayName: p.display_name || p.username || '', avatarUrl: p.avatar_url };
      }
    }

    const loadedMemories: Memory[] = (data || []).map((m: any) => ({
      id: m.id, userId: m.created_by, title: m.title, caption: m.caption || '',
      category: m.category as MemoryCategory, impact: m.impact, fondness: m.fondness,
      date: m.date, createdAt: m.created_at, updatedAt: m.updated_at, imageUrl: m.image_url,
      pos_x: m.pos_x, pos_z: m.pos_z,
    }));

    let gs = Math.max(5, Math.ceil(Math.sqrt(loadedMemories.length * 4)));
    const cc = get().customCategoryColors;
    const builtBuildings: Building[] = [];

    for (const m of loadedMemories) {
      const isCore = m.title.startsWith('[CORE]');
      let fp;
      if (m.pos_x != null && m.pos_z != null) {
        fp = { x: m.pos_x, z: m.pos_z };
        gs = Math.max(gs, fp.x + 3, fp.z + 3);
      } else {
        fp = findValidPosition(builtBuildings, gs, isCore);
        while (!fp) { gs += 2; fp = findValidPosition(builtBuildings, gs, isCore); }
        supabase.from('shared_memories').update({ pos_x: fp.x, pos_z: fp.z }).eq('id', m.id).then();
      }
      builtBuildings.push({
        id: m.id, memoryId: m.id, position: { x: fp.x, y: 0, z: fp.z },
        height: computeHeight(m.impact, m.fondness, isCore),
        color: getCategoryColor(m.category, cc), isAnimating: false, isCore,
      });
    }

    set({ memories: loadedMemories, buildings: builtBuildings, gridSize: gs, isLoading: false, creatorMap: newMap });
  },

  addMemory: async (input) => {
    set({ isLoading: true });
    const { sharedCityId, buildings, gridSize } = get();
    if (!sharedCityId) { set({ isLoading: false }); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { set({ isLoading: false }); return; }

    let imageUrl = '';
    if (input.image) {
      const ext = input.image.name.split('.').pop();
      const fn = `shared_${Math.random()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('memory-images').upload(fn, input.image);
      if (!upErr) { const { data: { publicUrl } } = supabase.storage.from('memory-images').getPublicUrl(fn); imageUrl = publicUrl; }
    }

    const isCore = !!input.isCore;
    let fp = findValidPosition(buildings, gridSize, isCore);
    let newGS = gridSize;
    while (!fp) { newGS += 2; fp = findValidPosition(buildings, newGS, isCore); }

    const finalTitle = isCore ? `[CORE] ${input.title}` : input.title;
    const { data, error } = await supabase.from('shared_memories').insert([{
      shared_city_id: sharedCityId, created_by: session.user.id,
      title: finalTitle, caption: input.caption || null, category: input.category,
      impact: input.impact, fondness: input.fondness, date: input.date.toISOString(),
      image_url: imageUrl || null, pos_x: fp.x, pos_z: fp.z,
    }]).select();

    if (error || !data?.[0]) { console.error('Error adding shared memory:', error?.message); set({ isLoading: false }); return; }
    const m = data[0];
    const memory: Memory = { id: m.id, userId: m.created_by, title: m.title, caption: m.caption || '', category: m.category as MemoryCategory, impact: m.impact, fondness: m.fondness, date: m.date, createdAt: m.created_at, updatedAt: m.updated_at, imageUrl: m.image_url, pos_x: m.pos_x, pos_z: m.pos_z };
    const newB: Building = { id: memory.id, memoryId: memory.id, position: { x: fp.x, y: 0, z: fp.z }, height: computeHeight(memory.impact, memory.fondness, isCore), color: getCategoryColor(memory.category, get().customCategoryColors), isAnimating: true, isCore };

    set({ memories: [...get().memories, memory], buildings: [...buildings, newB], gridSize: newGS, isLoading: false });
  },

  removeMemory: async (id) => {
    set({ selectedBuildingId: null });
    await new Promise(r => setTimeout(r, 300));
    set(s => ({ buildings: s.buildings.map(b => b.id === id ? { ...b, isDeleting: true } : b) }));
    await new Promise(r => setTimeout(r, 1000));
    const { error } = await supabase.from('shared_memories').delete().eq('id', id);
    if (error) { set(s => ({ buildings: s.buildings.map(b => b.id === id ? { ...b, isDeleting: false } : b) })); return; }
    set(s => ({ memories: s.memories.filter(m => m.id !== id), buildings: s.buildings.filter(b => b.id !== id) }));
  },

  repositionBuilding: async (bid, np) => {
    supabase.from('shared_memories').update({ pos_x: np.x, pos_z: np.z }).eq('id', bid).then();
    set(s => ({ buildings: s.buildings.map(b => b.id === bid ? { ...b, position: np } : b), isRepositioning: false, repositioningBuildingId: null, previewPosition: null, selectedBuildingId: null }));
  },

  selectBuilding: (id) => set({ selectedBuildingId: id }),
  expandGrid: () => set(s => ({ gridSize: s.gridSize + 2 })),
  setDeleting: (id, val) => set(s => ({ buildings: s.buildings.map(b => b.id === id ? { ...b, isDeleting: val } : b) })),

  startRepositioning: (bid) => {
    const b = get().buildings.find(b => b.id === bid);
    if (!b) return;
    set({ isRepositioning: true, repositioningBuildingId: bid, previewPosition: { x: b.position.x, z: b.position.z }, selectedBuildingId: null });
  },
  cancelRepositioning: () => set({ isRepositioning: false, repositioningBuildingId: null, previewPosition: null }),
  setPreviewPosition: (pos) => set({ previewPosition: pos }),

  commitReposition: async () => {
    const { repositioningBuildingId, previewPosition, buildings, gridSize } = get();
    if (!repositioningBuildingId || !previewPosition) return;
    const b = buildings.find(b => b.id === repositioningBuildingId);
    if (!b) return;
    const others = buildings.filter(b => b.id !== repositioningBuildingId);
    if (!isValidPosition(previewPosition, others, !!b.isCore, gridSize)) return;
    await get().repositionBuilding(repositioningBuildingId, { x: previewPosition.x, y: 0, z: previewPosition.z });
  },

  isTileValidForReposition: (x, z) => {
    const { repositioningBuildingId, buildings, gridSize } = get();
    if (!repositioningBuildingId) return false;
    const b = buildings.find(b => b.id === repositioningBuildingId);
    if (!b) return false;
    return isValidPosition({ x, z }, buildings.filter(b => b.id !== repositioningBuildingId), !!b.isCore, gridSize);
  },

  toggleTheme: () => set(s => ({ theme: s.theme === 'night' ? 'day' : 'night' })),
  setTimelineActive: (a) => set({ timelineActive: a, timelinePercent: 100 }),
  setTimelinePercent: (p) => set({ timelinePercent: Math.max(0, Math.min(100, p)) }),

  getVisibleBuildingIds: () => {
    const { memories, timelinePercent } = get();
    const sorted = [...memories].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const count = Math.round((timelinePercent / 100) * sorted.length);
    return new Set(sorted.slice(0, count).map(m => m.id));
  },

  fetchNPCUsers: async () => {
    const { sharedCityId } = get();
    if (!sharedCityId) return;
    const { data } = await supabase.from('shared_city_users').select('*').eq('shared_city_id', sharedCityId).order('created_at', { ascending: true });
    set({ npcUsers: (data || []).map((u: any) => ({ id: u.id, ownerId: u.created_by, name: u.name, description: u.description || '', gender: u.gender as 'male' | 'female', color: u.color, position: { x: u.pos_x, y: u.pos_y || 0, z: u.pos_z }, movementState: 'idle' as const, _targetX: u.pos_x, _targetZ: u.pos_z, _waitUntil: 0 })) });
  },

  addNPCUser: async (input) => {
    const { sharedCityId, buildings, npcUsers, gridSize } = get();
    if (!sharedCityId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const pos = findNPCSpawn(buildings, npcUsers, gridSize);
    const colors = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e84393','#00cec9','#6c5ce7'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const { data, error } = await supabase.from('shared_city_users').insert({ shared_city_id: sharedCityId, created_by: session.user.id, name: input.name, description: input.description, gender: input.gender, color, pos_x: pos.x, pos_y: 0, pos_z: pos.z }).select();
    if (error || !data?.[0]) return;
    const u = data[0];
    set({ npcUsers: [...get().npcUsers, { id: u.id, ownerId: u.created_by, name: u.name, description: u.description || '', gender: u.gender as 'male' | 'female', color: u.color, position: { x: u.pos_x, y: 0, z: u.pos_z }, movementState: 'idle', _targetX: u.pos_x, _targetZ: u.pos_z, _waitUntil: 0 }] });
  },

  removeNPCUser: async (id) => {
    await supabase.from('shared_city_users').delete().eq('id', id);
    set(s => ({ npcUsers: s.npcUsers.filter(u => u.id !== id), selectedNPCId: s.selectedNPCId === id ? null : s.selectedNPCId }));
  },

  updateNPCColor: async (id, color) => {
    await supabase.from('shared_city_users').update({ color, updated_at: new Date().toISOString() }).eq('id', id);
    set(s => ({ npcUsers: s.npcUsers.map(u => u.id === id ? { ...u, color } : u) }));
  },

  selectNPC: (id) => set({ selectedNPCId: id, selectedBuildingId: null }),
  setUserModalOpen: (o) => set({ isUserModalOpen: o }),

  tickNPCMovement: (delta) => {
    const { npcUsers, buildings, gridSize } = get();
    if (npcUsers.length === 0) return;
    const now = Date.now();
    let changed = false;
    const livePos = new Map<string, { x: number; z: number }>();
    for (const u of npcUsers) livePos.set(u.id, { x: u.position.x, z: u.position.z });

    const updated = npcUsers.map(u => {
      const user = { ...u };
      if (user._waitUntil && now < user._waitUntil) { user.movementState = 'idle'; return user; }
      const hasTarget = user._targetX !== undefined && user._targetZ !== undefined;
      const atTarget = hasTarget && Math.abs(user.position.x - user._targetX!) < 0.08 && Math.abs(user.position.z - user._targetZ!) < 0.08;
      if (!hasTarget || atTarget) {
        if (atTarget) { user._waitUntil = now + 1500 + Math.random() * 2500; user.movementState = 'idle'; user._targetX = undefined; user._targetZ = undefined; changed = true; return user; }
        for (let a = 0; a < 20; a++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 1.5 + Math.random() * 2.5;
          let nx = Math.max(0.5, Math.min(gridSize - 0.5, user.position.x + Math.cos(angle) * dist));
          let nz = Math.max(0.5, Math.min(gridSize - 0.5, user.position.z + Math.sin(angle) * dist));
          const blocked = buildings.some(b => { const fp = b.isCore ? 5 : 1; const h = fp / 2 + 0.5; return nx >= b.position.x - h && nx <= b.position.x + h && nz >= b.position.z - h && nz <= b.position.z + h; });
          if (!blocked) { user._targetX = nx; user._targetZ = nz; user._waitUntil = undefined; changed = true; break; }
        }
        if (user._targetX === undefined) { user._waitUntil = now + 500 + Math.random() * 1000; user.movementState = 'idle'; changed = true; }
        return user;
      }
      if (user._targetX !== undefined && user._targetZ !== undefined) {
        const dx = user._targetX - user.position.x; const dz = user._targetZ - user.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.08) {
          const step = Math.min((0.5 + Math.random() * 0.15) * delta, dist);
          user.position = { ...user.position, x: user.position.x + (dx / dist) * step, z: user.position.z + (dz / dist) * step };
          user.movementState = 'walking'; changed = true;
        } else { user.position = { ...user.position, x: user._targetX, z: user._targetZ }; user._targetX = undefined; user._targetZ = undefined; user.movementState = 'idle'; changed = true; }
      }
      return user;
    });
    if (changed) set({ npcUsers: updated });
  },

  setCustomCategoryColor: (cat, color) => { const u = { ...get().customCategoryColors, [cat]: color }; saveCustomColors(u); set({ customCategoryColors: u }); get().applyCustomColorsToBuildings(); },
  resetCustomCategoryColors: () => { saveCustomColors({}); set({ customCategoryColors: {} }); get().applyCustomColorsToBuildings(); },
  applyCustomColorsToBuildings: () => {
    const { buildings, memories, customCategoryColors } = get();
    set({ buildings: buildings.map(b => { const m = memories.find(m => m.id === b.memoryId); if (!m) return b; const c = getCategoryColor(m.category, customCategoryColors); return c !== b.color ? { ...b, color: c } : b; }) });
  },
}));
