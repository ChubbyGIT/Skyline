"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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

/** Handles auth guard + invite token from URL — must be inside Suspense.
 *  With the /auth/callback PKCE exchange route, the session is already
 *  established by the time the user lands here. */
function InviteHandler() {
  const searchParams = useSearchParams();
  const processInviteToken = useStore(s => s.processInviteToken);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      // Small delay to let Supabase client hydrate session from cookies/localStorage
      await new Promise(r => setTimeout(r, 500));
      if (cancelled) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session after hydration — redirect to landing page
        window.location.href = '/';
        return;
      }

      // Session is valid — process invite token if present
      const inviteToken = searchParams.get('invite_token');
      if (inviteToken) {
        await processInviteToken(inviteToken);
        const url = new URL(window.location.href);
        url.searchParams.delete('invite_token');
        window.history.replaceState({}, '', url.pathname);
      }
    };

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  return null;
}

export default function CityPage() {
  return (
    <>
      <Suspense fallback={null}>
        <InviteHandler />
      </Suspense>

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

