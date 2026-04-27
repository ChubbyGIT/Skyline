"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const Scene = dynamic(
  () => import("@/components/three/Scene").then((m) => ({ default: m.Scene })),
  { ssr: false, loading: () => null }
);

const BackgroundMusic = dynamic(
  () => import("@/components/ui/BackgroundMusic").then((m) => ({ default: m.BackgroundMusic })),
  { ssr: false, loading: () => null }
);

export default function FriendCityPage() {
  const params = useParams();
  const userId = params?.userId as string;
  const [friendName, setFriendName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { fetchPublicCity, setViewMode } = useStore();

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      // Fetch friend's profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', userId)
        .single();

      if (profile) {
        setFriendName(profile.display_name || profile.username || 'Friend');
      }

      // Set view mode (read-only)
      setViewMode(true, userId, profile?.display_name || profile?.username || 'Friend');

      // Fetch their city data
      await fetchPublicCity(userId);
      setLoading(false);
    };

    load();

    return () => {
      setViewMode(false);
    };
  }, [userId]);

  return (
    <>
      <Scene />

      {/* ── View Mode Banner ── */}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(6, 40, 30, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: '16px',
          padding: '12px 28px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 25px rgba(52,211,153,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontFamily: "'Inter', system-ui, sans-serif",
          animation: 'viewBannerIn 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Live indicator */}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#34d399',
          boxShadow: '0 0 8px #34d399',
          animation: 'viewPulse 2s ease-in-out infinite',
        }} />

        {/* Text */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#d1fae5' }}>
            Viewing {friendName ? `${friendName}'s` : 'a'} City
          </div>
          <div style={{ fontSize: '10px', color: '#6ee7b780', marginTop: '1px' }}>
            Read-only mode · Visual exploration only
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => window.close()}
          style={{
            marginLeft: '16px',
            padding: '6px 16px',
            borderRadius: '10px',
            background: 'rgba(52,211,153,0.12)',
            border: '1px solid rgba(52,211,153,0.3)',
            color: '#6ee7b7',
            fontWeight: 600,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            letterSpacing: '0.5px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(52,211,153,0.25)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(52,211,153,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(52,211,153,0.12)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Close
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(6, 40, 30, 0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '16px',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid rgba(52,211,153,0.2)',
            borderTopColor: '#34d399',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: '14px', color: '#6ee7b7', fontWeight: 500 }}>
            Loading {friendName ? `${friendName}'s` : ''} city...
          </div>
        </div>
      )}

      <BackgroundMusic />

      {/* Animations */}
      <style>{`
        @keyframes viewBannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes viewPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
