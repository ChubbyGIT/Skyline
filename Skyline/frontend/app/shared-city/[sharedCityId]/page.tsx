"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSharedCityStore } from "@/store/useSharedCityStore";
import { useStore } from "@/store/useStore";
import dynamic from "next/dynamic";

const Scene = dynamic(
  () => import("@/components/three/Scene").then((m) => ({ default: m.Scene })),
  { ssr: false, loading: () => null }
);

const UIOverlay = dynamic(
  () => import("@/components/ui/UIOverlay").then((m) => ({ default: m.UIOverlay })),
  { ssr: false, loading: () => null }
);

const BackgroundMusic = dynamic(
  () => import("@/components/ui/BackgroundMusic").then((m) => ({ default: m.BackgroundMusic })),
  { ssr: false, loading: () => null }
);

/**
 * SharedCityBridge: syncs useSharedCityStore data into useStore
 * so the existing UIOverlay (and Scene/City/Building components)
 * work seamlessly with shared city data.
 */
function SharedCityBridge({ sharedCityId }: { sharedCityId: string }) {
  const shared = useSharedCityStore();
  const mainStore = useStore();

  // Sync shared city data → main store whenever it changes
  useEffect(() => {
    useStore.setState({
      memories: shared.memories,
      buildings: shared.buildings,
      gridSize: shared.gridSize,
      selectedBuildingId: shared.selectedBuildingId,
      isRepositioning: shared.isRepositioning,
      repositioningBuildingId: shared.repositioningBuildingId,
      previewPosition: shared.previewPosition,
      isLoading: shared.isLoading,
      theme: shared.theme,
      timelineActive: shared.timelineActive,
      timelinePercent: shared.timelinePercent,
      npcUsers: shared.npcUsers,
      selectedNPCId: shared.selectedNPCId,
      isUserModalOpen: shared.isUserModalOpen,
      customCategoryColors: shared.customCategoryColors,
      // Disable view mode so full CRUD is available
      viewMode: false,
      viewingUserId: null,
      viewingUserName: null,
    });
  }, [
    shared.memories, shared.buildings, shared.gridSize,
    shared.selectedBuildingId, shared.isRepositioning,
    shared.repositioningBuildingId, shared.previewPosition,
    shared.isLoading, shared.theme, shared.timelineActive,
    shared.timelinePercent, shared.npcUsers, shared.selectedNPCId,
    shared.isUserModalOpen, shared.customCategoryColors,
  ]);

  // Override main store actions to point to shared city store
  useEffect(() => {
    useStore.setState({
      fetchMemories: shared.fetchSharedMemories,
      addMemory: shared.addMemory,
      removeMemory: shared.removeMemory,
      repositionBuilding: shared.repositionBuilding,
      selectBuilding: shared.selectBuilding,
      expandGrid: shared.expandGrid,
      setDeleting: shared.setDeleting,
      startRepositioning: shared.startRepositioning,
      cancelRepositioning: shared.cancelRepositioning,
      setPreviewPosition: shared.setPreviewPosition,
      commitReposition: shared.commitReposition,
      isTileValidForReposition: shared.isTileValidForReposition,
      toggleTheme: shared.toggleTheme,
      setTimelineActive: shared.setTimelineActive,
      setTimelinePercent: shared.setTimelinePercent,
      getVisibleBuildingIds: shared.getVisibleBuildingIds,
      fetchNPCUsers: shared.fetchNPCUsers,
      addNPCUser: shared.addNPCUser,
      removeNPCUser: shared.removeNPCUser,
      updateNPCColor: shared.updateNPCColor,
      selectNPC: shared.selectNPC,
      setUserModalOpen: shared.setUserModalOpen,
      tickNPCMovement: shared.tickNPCMovement,
      setCustomCategoryColor: shared.setCustomCategoryColor,
      resetCustomCategoryColors: shared.resetCustomCategoryColors,
      applyCustomColorsToBuildings: shared.applyCustomColorsToBuildings,
    } as any);
  }, [shared]);

  return null;
}

export default function SharedCityPage() {
  const params = useParams();
  const router = useRouter();
  const sharedCityId = params?.sharedCityId as string;
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const { initSharedCity, cleanup, cityName, partnerProfile, currentUserProfile } = useSharedCityStore();

  useEffect(() => {
    if (!sharedCityId) return;
    const load = async () => {
      const ok = await initSharedCity(sharedCityId);
      if (!ok) { setUnauthorized(true); }
      setLoading(false);
    };
    load();
    return () => { cleanup(); };
  }, [sharedCityId]);

  if (unauthorized) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'linear-gradient(145deg, #06281e, #0d3b2e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444' }}>Access Denied</div>
        <div style={{ fontSize: '14px', color: '#d1fae5cc', maxWidth: '400px', textAlign: 'center', lineHeight: 1.7 }}>
          You don't have access to this shared city. Only the two participants can view it.
        </div>
        <button onClick={() => router.push('/city')} style={{
          marginTop: '12px', padding: '12px 28px', borderRadius: '999px',
          background: 'linear-gradient(135deg, #34d399, #10b981)', color: 'white',
          fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(16,185,129,0.4)', fontFamily: 'inherit',
        }}>
          Back to My City
        </button>
      </div>
    );
  }

  return (
    <>
      {!loading && !unauthorized && <SharedCityBridge sharedCityId={sharedCityId} />}
      <Scene />

      {/* Shared City Header */}
      <div style={{
        position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
        background: 'rgba(6, 40, 30, 0.92)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px',
        padding: '12px 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 25px rgba(139,92,246,0.1)',
        display: 'flex', alignItems: 'center', gap: '14px',
        fontFamily: "'Inter', system-ui, sans-serif",
        animation: 'viewBannerIn 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {currentUserProfile?.avatarUrl ? (
            <img src={currentUserProfile.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(52,211,153,0.5)', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #34d399, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
              {(currentUserProfile?.displayName || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{ width: 32, height: 32, borderRadius: '50%', marginLeft: '-10px', border: '2px solid rgba(139,92,246,0.5)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            {partnerProfile?.avatarUrl ? (
              <img src={partnerProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                {(partnerProfile?.displayName || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#d1fae5' }}>{cityName || 'Shared City'}</div>
          <div style={{ fontSize: '10px', color: '#a78bfa', marginTop: '1px' }}>Shared with {partnerProfile?.displayName || 'Partner'}</div>
        </div>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 8px #a78bfa', animation: 'viewPulse 2s ease-in-out infinite', marginLeft: '4px' }} />
        <button onClick={() => router.push('/city')} style={{
          marginLeft: '8px', padding: '6px 16px', borderRadius: '10px',
          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
          color: '#6ee7b7', fontWeight: 600, fontSize: '11px', cursor: 'pointer',
          transition: 'all 0.2s', fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.12)'; }}
        >Back to My City</button>
      </div>

      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6, 40, 30, 0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: '14px', color: '#a78bfa', fontWeight: 500 }}>Loading shared city...</div>
        </div>
      )}

      {!loading && !unauthorized && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <UIOverlay />
        </div>
      )}
      <BackgroundMusic />

      <style>{`
        @keyframes viewBannerIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes viewPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
