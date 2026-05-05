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

/** Auth guard + invite token handler — must be inside Suspense.
 *  Uses onAuthStateChange to wait for implicit-flow hash fragment
 *  processing before checking session. */
function InviteHandler() {
  const searchParams = useSearchParams();
  const processInviteToken = useStore(s => s.processInviteToken);

  useEffect(() => {
    // Detect if we arrived from OAuth (hash contains tokens)
    const hashHasTokens = window.location.hash.includes('access_token');
    let handled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (handled) return;

        // For new users: INITIAL_SESSION fires with null BEFORE the hash
        // is processed. Skip it — wait for SIGNED_IN instead.
        if (!session && hashHasTokens && event === 'INITIAL_SESSION') {
          return;
        }

        if (!session) {
          // Genuinely no session — go to landing page
          window.location.href = '/';
          return;
        }

        // Auth succeeded
        handled = true;

        // Process invite token if present
        const inviteToken = searchParams.get('invite_token');
        if (inviteToken) {
          await processInviteToken(inviteToken);
          const url = new URL(window.location.href);
          url.searchParams.delete('invite_token');
          window.history.replaceState({}, '', url.pathname);
        }

        // Clean hash fragment from URL
        if (window.location.hash) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    );

    // Safety net: if nothing fires within 8s, check manually
    const timer = setTimeout(async () => {
      if (handled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = '/';
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
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

