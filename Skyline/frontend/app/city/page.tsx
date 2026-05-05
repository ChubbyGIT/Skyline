"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import dynamic from "next/dynamic";

// Never SSR Three.js — browser WebGL only
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

export default function CityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processInviteToken = useStore(s => s.processInviteToken);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/';
        return;
      }

      // Process invite token if present (auto-connect friend after signup)
      const inviteToken = searchParams.get('invite_token');
      if (inviteToken) {
        await processInviteToken(inviteToken);
        // Clean up URL — remove the token query param
        const url = new URL(window.location.href);
        url.searchParams.delete('invite_token');
        window.history.replaceState({}, '', url.pathname);
      }
    };
    checkUser();
  }, []);

  return (
    <>
      {/* Scene owns its own fixed positioning — no wrapper needed */}
      <Scene />

      {/* UI floats above the canvas */}
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

      <BackgroundMusic />
    </>
  );
}
