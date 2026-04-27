import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export enum MemoryCategory {
  CAREER = 'career',
  HEALTH = 'health',
  RELATIONSHIPS = 'relationships',
  PERSONAL = 'personal',
  OTHER = 'other'
}

export interface Vector3Position {
  x: number;
  y: number; // Always 0 for ground level
  z: number;
}

export interface Memory {
  id: string;
  userId?: string;
  title: string;
  caption?: string;
  category: MemoryCategory;
  impact: number;
  fondness: number;
  date: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  imageUrl?: string;
  pos_x?: number;
  pos_z?: number;
}

export interface Building {
  id: string; // Matches memory.id
  memoryId: string;
  position: Vector3Position;
  height: number;
  color: string;
  isAnimating: boolean;
  isDeleting?: boolean;
  isCore?: boolean;
}

export interface GridTile {
  x: number;
  z: number;
  occupied: boolean;
  isRoad: boolean;
  buildingId?: string;
}

export interface FriendProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  lastActive: string;
  lastEntryAt?: string;
  buildingCount?: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  fromProfile?: FriendProfile;
  toProfile?: FriendProfile;
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

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  [MemoryCategory.CAREER]: '#4A90E2', // Blue
  [MemoryCategory.HEALTH]: '#FF69B4', // Pink
  [MemoryCategory.RELATIONSHIPS]: '#90EE90', // Green
  [MemoryCategory.PERSONAL]: '#FF6B6B', // Red
  [MemoryCategory.OTHER]: '#FFD700' // Gold-Yellow
};

// Helper: compute building height using weighted average of impact + fondness (Option A)
// Impact/fondness are stored on 1-100 scale; we normalize to 1-10 for the formula.
export function computeHeight(impact: number, fondness: number, isCore: boolean): number {
  const normImpact = impact / 10;
  const normFondness = fondness / 10;
  const blended = normImpact * 0.6 + normFondness * 0.4;
  if (isCore) {
    // Castle: height = min(blended * 1.0, 10)
    return Math.min(blended * 1.0, 10);
  }
  // Standard building: height = min(blended * 1.5, 15)
  return Math.min(blended * 1.5, 15);
}

interface CityState {
  memories: Memory[];
  buildings: Building[];
  gridSize: number;
  selectedBuildingId: string | null;
  isRepositioning: boolean;
  repositioningBuildingId: string | null;
  previewPosition: { x: number; z: number } | null;
  isLoading: boolean;
  theme: 'day' | 'night';
  // Timeline state
  timelineActive: boolean;
  timelinePercent: number; // 0-100
  // Friends state
  friends: FriendProfile[];
  friendRequests: FriendRequest[];
  friendsLoading: boolean;
  currentUserProfile: FriendProfile | null;
  // View mode (for visiting friend cities)
  viewMode: boolean;
  viewingUserId: string | null;
  viewingUserName: string | null;
}

interface CityActions {
  fetchMemories: () => Promise<void>;
  addMemory: (input: MemoryInput) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  repositionBuilding: (buildingId: string, newPosition: Vector3Position) => Promise<void>;
  selectBuilding: (id: string | null) => void;
  expandGrid: () => void;
  setDeleting: (id: string, val: boolean) => void;
  startRepositioning: (buildingId: string) => void;
  cancelRepositioning: () => void;
  setPreviewPosition: (pos: { x: number; z: number } | null) => void;
  commitReposition: () => Promise<void>;
  isTileValidForReposition: (x: number, z: number) => boolean;
  // Timeline actions
  setTimelineActive: (active: boolean) => void;
  setTimelinePercent: (percent: number) => void;
  getVisibleBuildingIds: () => Set<string>;
  // Friends actions
  fetchCurrentProfile: () => Promise<void>;
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<FriendProfile[]>;
  sendFriendRequest: (toUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  sendEmailInvite: (email: string, message: string) => Promise<void>;
  fetchPublicCity: (userId: string) => Promise<void>;
  setViewMode: (active: boolean, userId?: string, userName?: string) => void;
}

export type CityStore = CityState & CityActions;

export const useStore = create<CityStore>((set, get) => ({
  memories: [],
  buildings: [],
  gridSize: 3,
  selectedBuildingId: null,
  isRepositioning: false,
  repositioningBuildingId: null,
  previewPosition: null,
  isLoading: false,
  theme: 'night',
  timelineActive: false,
  timelinePercent: 100,
  // Friends initial state
  friends: [],
  friendRequests: [],
  friendsLoading: false,
  currentUserProfile: null,
  // View mode
  viewMode: false,
  viewingUserId: null,
  viewingUserName: null,

  fetchMemories: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching memories:', error.message || error);
        set({ isLoading: false });
        return;
    }

    const loadedMemories = (data as any[]).map(m => ({
        id: m.id,
        userId: m.user_id,
        title: m.title,
        caption: m.caption || '',
        category: m.category as MemoryCategory,
        impact: m.impact,
        fondness: m.fondness,
        date: m.date,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        imageUrl: m.image_url,
        pos_x: m.pos_x,
        pos_z: m.pos_z
    })) as Memory[];

    let initialGridSize = Math.max(5, Math.ceil(Math.sqrt(loadedMemories.length * 4)));
    const builtBuildings: Building[] = [];

    for (const m of loadedMemories) {
        const isCore = m.title.startsWith('[CORE]');
        let foundPos;
        
        if (m.pos_x !== undefined && m.pos_x !== null && m.pos_z !== undefined && m.pos_z !== null) {
            foundPos = { x: m.pos_x, z: m.pos_z };
            initialGridSize = Math.max(initialGridSize, foundPos.x + 3, foundPos.z + 3);
        } else {
            foundPos = findValidPosition(builtBuildings, initialGridSize, isCore);
            while (!foundPos) {
                initialGridSize += 2;
                foundPos = findValidPosition(builtBuildings, initialGridSize, isCore);
            }
            supabase.from('memories').update({ pos_x: foundPos.x, pos_z: foundPos.z }).eq('id', m.id).then();
        }

        builtBuildings.push({
            id: m.id,
            memoryId: m.id,
            position: { x: foundPos.x, y: 0, z: foundPos.z },
            height: computeHeight(m.impact, m.fondness, isCore),
            color: CATEGORY_COLORS[m.category],
            isAnimating: false,
            isCore: isCore
        });
    }

    set({ memories: loadedMemories, buildings: builtBuildings, isLoading: false, gridSize: initialGridSize });
  },

  addMemory: async (input) => {
    set({ isLoading: true });
    
    let imageUrl = '';
    if (input.image) {
        const fileExt = input.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('memory-images')
            .upload(fileName, input.image);
        
        if (uploadError) {
            console.error('Upload error:', uploadError);
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('memory-images')
                .getPublicUrl(fileName);
            imageUrl = publicUrl;
        }
    }

    const { buildings, gridSize } = get();
    const isCore = !!input.isCore;
    
    // Find valid position FIRST
    let foundPos = findValidPosition(buildings, gridSize, isCore);
    let newGridSize = gridSize;
    
    while (!foundPos) {
      newGridSize += 2;
      foundPos = findValidPosition(buildings, newGridSize, isCore);
    }

    const finalTitle = input.isCore ? `[CORE] ${input.title}` : input.title;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session found');
      set({ isLoading: false });
      return;
    }

    const newMemoryData = {
      user_id: session.user.id,
      title: finalTitle,
      caption: input.caption || null,
      category: input.category,
      impact: input.impact,
      fondness: input.fondness,
      date: input.date.toISOString(),
      image_url: imageUrl || null,
      pos_x: foundPos.x,
      pos_z: foundPos.z,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('memories')
      .insert([newMemoryData])
      .select();

    if (error) {
      console.error('Error adding memory:', error.message || error);
      set({ isLoading: false });
      return;
    }

    const m = data[0];
    const memory: Memory = {
        id: m.id,
        userId: m.user_id,
        title: m.title,
        caption: m.caption || '',
        category: m.category as MemoryCategory,
        impact: m.impact,
        fondness: m.fondness,
        date: m.date,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        imageUrl: m.image_url,
        pos_x: m.pos_x,
        pos_z: m.pos_z
    };

    const newBuilding: Building = {
      id: memory.id,
      memoryId: memory.id,
      position: { x: foundPos.x, y: 0, z: foundPos.z },
      height: computeHeight(memory.impact, memory.fondness, isCore),
      color: CATEGORY_COLORS[memory.category],
      isAnimating: true,
      isCore: isCore,
    };

    set({ 
      memories: [...get().memories, memory],
      buildings: [...buildings, newBuilding],
      gridSize: newGridSize,
      isLoading: false
    });
  },

  removeMemory: async (id) => {
    // Close details popup first so user can see the demolition animation
    set({ selectedBuildingId: null });

    // Small delay so the popup closes visually before animation starts
    await new Promise(resolve => setTimeout(resolve, 300));

    // Start deletion animation
    set((state) => ({
        buildings: state.buildings.map(b => b.id === id ? { ...b, isDeleting: true } : b)
    }));

    // Wait for demolition animation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting memory:', error.message || error);
      // Revert if error?
      set((state) => ({
        buildings: state.buildings.map(b => b.id === id ? { ...b, isDeleting: false } : b)
      }));
      return;
    }

    set((state) => ({
      memories: state.memories.filter(m => m.id !== id),
      buildings: state.buildings.filter(b => b.id !== id),
    }));
  },

  repositionBuilding: async (buildingId, newPosition) => {
    supabase.from('memories').update({ pos_x: newPosition.x, pos_z: newPosition.z }).eq('id', buildingId).then();
    set((state) => ({
      buildings: state.buildings.map(b => b.id === buildingId ? { ...b, position: newPosition } : b),
      isRepositioning: false,
      repositioningBuildingId: null,
      previewPosition: null,
      selectedBuildingId: null
    }));
  },

  selectBuilding: (id) => set({ selectedBuildingId: id }),
  
  expandGrid: () => set((state) => ({ gridSize: state.gridSize + 2 })),

  setDeleting: (id, val) => set((state) => ({
      buildings: state.buildings.map(b => b.id === id ? { ...b, isDeleting: val } : b)
  })),

  /* ─── Repositioning actions ─── */

  startRepositioning: (buildingId) => {
    const building = get().buildings.find(b => b.id === buildingId);
    if (!building) return;
    set({
      isRepositioning: true,
      repositioningBuildingId: buildingId,
      previewPosition: { x: building.position.x, z: building.position.z },
      selectedBuildingId: null, // Close the details popup
    });
  },

  cancelRepositioning: () => {
    set({
      isRepositioning: false,
      repositioningBuildingId: null,
      previewPosition: null,
    });
  },

  setPreviewPosition: (pos) => {
    set({ previewPosition: pos });
  },

  commitReposition: async () => {
    const { repositioningBuildingId, previewPosition, buildings, gridSize } = get();
    if (!repositioningBuildingId || !previewPosition) return;

    const building = buildings.find(b => b.id === repositioningBuildingId);
    if (!building) return;

    // Validate the position (excluding the building being moved)
    const othersBuildings = buildings.filter(b => b.id !== repositioningBuildingId);
    const isCore = !!building.isCore;
    if (!isValidPosition(previewPosition, othersBuildings, isCore, gridSize)) return;

    await get().repositionBuilding(repositioningBuildingId, { x: previewPosition.x, y: 0, z: previewPosition.z });
  },

  isTileValidForReposition: (x, z) => {
    const { repositioningBuildingId, buildings, gridSize } = get();
    if (!repositioningBuildingId) return false;

    const building = buildings.find(b => b.id === repositioningBuildingId);
    if (!building) return false;

    const othersBuildings = buildings.filter(b => b.id !== repositioningBuildingId);
    return isValidPosition({ x, z }, othersBuildings, !!building.isCore, gridSize);
  },

  /* ─── Timeline actions ─── */

  setTimelineActive: (active) => {
    set({ timelineActive: active, timelinePercent: active ? 100 : 100 });
  },

  setTimelinePercent: (percent) => {
    set({ timelinePercent: Math.max(0, Math.min(100, percent)) });
  },

  getVisibleBuildingIds: () => {
    const { memories, buildings, timelinePercent } = get();
    // Sort memories by their createdAt (construction order)
    const sorted = [...memories].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const total = sorted.length;
    const visibleCount = Math.round((timelinePercent / 100) * total);
    const visibleIds = new Set(sorted.slice(0, visibleCount).map(m => m.id));
    return visibleIds;
  },

  /* ─── Friends actions ─── */

  fetchCurrentProfile: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error) {
      console.error('Error fetching profile:', error.message);
      return;
    }
    if (data) {
      set({
        currentUserProfile: {
          id: data.id,
          username: data.username || '',
          displayName: data.display_name || '',
          email: data.email || '',
          avatarUrl: data.avatar_url,
          createdAt: data.created_at,
          lastActive: data.last_active,
          lastEntryAt: data.last_entry_at,
        }
      });
    }
  },

  fetchFriends: async () => {
    set({ friendsLoading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { set({ friendsLoading: false }); return; }
    const uid = session.user.id;

    // Get friendships where user is either party
    const { data: fships, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_a.eq.${uid},user_b.eq.${uid}`);

    if (error) {
      console.error('Error fetching friendships:', error.message);
      set({ friendsLoading: false });
      return;
    }

    // Get friend profile IDs
    const friendIds = (fships || []).map(f => f.user_a === uid ? f.user_b : f.user_a);
    if (friendIds.length === 0) {
      set({ friends: [], friendsLoading: false });
      return;
    }

    // Fetch friend profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    // Get building counts for each friend
    const friendProfiles: FriendProfile[] = await Promise.all(
      (profiles || []).map(async (p: any) => {
        const { count } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', p.id);
        return {
          id: p.id,
          username: p.username || '',
          displayName: p.display_name || '',
          email: p.email || '',
          avatarUrl: p.avatar_url,
          createdAt: p.created_at,
          lastActive: p.last_active,
          lastEntryAt: p.last_entry_at,
          buildingCount: count || 0,
        };
      })
    );

    set({ friends: friendProfiles, friendsLoading: false });
  },

  fetchFriendRequests: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching friend requests:', error.message);
      return;
    }

    // Enrich with profiles
    const allUserIds = new Set<string>();
    (data || []).forEach((r: any) => { allUserIds.add(r.from_user_id); allUserIds.add(r.to_user_id); });
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(allUserIds));

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    const enriched: FriendRequest[] = (data || []).map((r: any) => ({
      id: r.id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      status: r.status,
      createdAt: r.created_at,
      fromProfile: profileMap[r.from_user_id] ? {
        id: profileMap[r.from_user_id].id,
        username: profileMap[r.from_user_id].username || '',
        displayName: profileMap[r.from_user_id].display_name || '',
        email: profileMap[r.from_user_id].email || '',
        avatarUrl: profileMap[r.from_user_id].avatar_url,
        createdAt: profileMap[r.from_user_id].created_at,
        lastActive: profileMap[r.from_user_id].last_active,
      } : undefined,
      toProfile: profileMap[r.to_user_id] ? {
        id: profileMap[r.to_user_id].id,
        username: profileMap[r.to_user_id].username || '',
        displayName: profileMap[r.to_user_id].display_name || '',
        email: profileMap[r.to_user_id].email || '',
        avatarUrl: profileMap[r.to_user_id].avatar_url,
        createdAt: profileMap[r.to_user_id].created_at,
        lastActive: profileMap[r.to_user_id].last_active,
      } : undefined,
    }));

    set({ friendRequests: enriched });
  },

  searchUsers: async (query: string) => {
    if (!query || query.length < 2) return [];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', session.user.id)
      .limit(10);

    if (error) {
      console.error('Error searching users:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      username: p.username || '',
      displayName: p.display_name || '',
      email: p.email || '',
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
      lastActive: p.last_active,
    }));
  },

  sendFriendRequest: async (toUserId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('friend_requests')
      .insert({ from_user_id: session.user.id, to_user_id: toUserId });

    if (error) {
      console.error('Error sending friend request:', error.message);
      return;
    }
    await get().fetchFriendRequests();
  },

  acceptFriendRequest: async (requestId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get the request
    const { data: req } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!req) return;

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    // Create friendship (order by UUID to avoid duplicates)
    const [a, b] = [req.from_user_id, req.to_user_id].sort();
    await supabase
      .from('friendships')
      .insert({ user_a: a, user_b: b });

    await get().fetchFriends();
    await get().fetchFriendRequests();
  },

  declineFriendRequest: async (requestId: string) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);
    await get().fetchFriendRequests();
  },

  removeFriend: async (friendId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;
    const [a, b] = [uid, friendId].sort();

    await supabase
      .from('friendships')
      .delete()
      .eq('user_a', a)
      .eq('user_b', b);

    await get().fetchFriends();
  },

  sendEmailInvite: async (email: string, message: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Store invitation in DB
    await supabase
      .from('invitations')
      .insert({
        inviter_id: session.user.id,
        invitee_email: email,
        message: message || 'Come check out my Skyline city!',
      });

    // Get inviter name from profile
    const { currentUserProfile } = get();
    const inviterName = currentUserProfile?.displayName || currentUserProfile?.username || 'A Skyline user';

    // Send email via Supabase Edge Function
    try {
      const { error } = await supabase.functions.invoke('send-invite', {
        body: {
          to_email: email,
          inviter_name: inviterName,
          message: message || '',
        },
      });
      if (error) throw error;
      console.log(`Invitation email sent to ${email}`);
    } catch (err) {
      console.warn('Email send failed (invite stored in DB):', err);
    }
  },

  fetchPublicCity: async (userId: string) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching public city:', error.message);
      set({ isLoading: false });
      return;
    }

    const loadedMemories = (data as any[]).map(m => ({
      id: m.id,
      userId: m.user_id,
      title: m.title,
      caption: m.caption || '',
      category: m.category as MemoryCategory,
      impact: m.impact,
      fondness: m.fondness,
      date: m.date,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      imageUrl: m.image_url,
      pos_x: m.pos_x,
      pos_z: m.pos_z
    })) as Memory[];

    let initialGridSize = Math.max(5, Math.ceil(Math.sqrt(loadedMemories.length * 4)));
    const builtBuildings: Building[] = [];

    for (const m of loadedMemories) {
      const isCore = m.title.startsWith('[CORE]');
      let foundPos;
      
      if (m.pos_x !== undefined && m.pos_x !== null && m.pos_z !== undefined && m.pos_z !== null) {
        foundPos = { x: m.pos_x, z: m.pos_z };
        initialGridSize = Math.max(initialGridSize, foundPos.x + 3, foundPos.z + 3);
      } else {
        foundPos = findValidPosition(builtBuildings, initialGridSize, isCore);
        while (!foundPos) {
          initialGridSize += 2;
          foundPos = findValidPosition(builtBuildings, initialGridSize, isCore);
        }
      }

      builtBuildings.push({
        id: m.id,
        memoryId: m.id,
        position: { x: foundPos.x, y: 0, z: foundPos.z },
        height: computeHeight(m.impact, m.fondness, isCore),
        color: CATEGORY_COLORS[m.category],
        isAnimating: false,
        isCore: isCore
      });
    }

    set({ memories: loadedMemories, buildings: builtBuildings, isLoading: false, gridSize: initialGridSize });
  },

  setViewMode: (active, userId, userName) => {
    set({
      viewMode: active,
      viewingUserId: userId || null,
      viewingUserName: userName || null,
    });
  },
}));

function isValidPosition(pos: { x: number; z: number }, buildings: Building[], isCore: boolean, gridSize: number) {
  // Castle needs 2 rows clearance each side (5 base + 2 buffer = 7), skyscraper needs 1 row (2)
  const reqSize = isCore ? 7 : 2; 
  
  // Grid bounds check
  const halfReqSize = Math.floor(reqSize / 2);
  if (pos.x - halfReqSize < 0 || pos.x + halfReqSize >= gridSize) return false;
  if (pos.z - halfReqSize < 0 || pos.z + halfReqSize >= gridSize) return false;

  return !buildings.some(b => {
    const bSize = b.isCore ? 7 : 2;
    return Math.abs(b.position.x - pos.x) < (reqSize + bSize)/2 && Math.abs(b.position.z - pos.z) < (reqSize + bSize)/2;
  });
}

function findValidPosition(buildings: Building[], gridSize: number, isCore: boolean = false) {
  const half = Math.floor(gridSize / 2);
  const positions: {x: number, z: number, dist: number}[] = [];
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      const dist = Math.sqrt(Math.pow(x - half, 2) + Math.pow(z - half, 2));
      positions.push({ x, z, dist });
    }
  }
  
  positions.sort((a, b) => a.dist - b.dist);

  for (const pos of positions) {
    if (isValidPosition(pos, buildings, isCore, gridSize)) {
      return { x: pos.x, z: pos.z };
    }
  }
  return null;
}
