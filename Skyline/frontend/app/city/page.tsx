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

/** Handles invite token from URL — must be inside Suspense.
 *  Uses onAuthStateChange so new users returning from OAuth
 *  aren't bounced before the hash-fragment token exchange finishes. */
function InviteHandler() {
  const searchParams = useSearchParams();
  const processInviteToken = useStore(s => s.processInviteToken);

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    // Check if we're in the middle of an OAuth redirect (hash contains tokens)
    const hasOAuthHash = typeof window !== 'undefined' &&
      window.location.hash.includes('access_token');

    // Listen for auth state changes — this fires once the hash
    // fragment has been exchanged for a session (new users) or
    // immediately if a session already exists in localStorage.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Clear the safety redirect since auth resolved
        if (redirectTimer) {
          clearTimeout(redirectTimer);
          redirectTimer = null;
        }

        if (!session) {
          // If we're in the middle of an OAuth hash exchange,
          // the INITIAL_SESSION fires with null before SIGNED_IN.
          // Don't redirect yet — wait for the real auth event.
          if (hasOAuthHash && event === 'INITIAL_SESSION') return;

          // Auth truly resolved with no session → send to landing page
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
      }
    );

    // Safety net: if no auth event fires within 10 seconds (e.g.
    // someone navigated directly to /city without logging in),
    // check the session manually and redirect if needed.
    redirectTimer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/';
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      if (redirectTimer) clearTimeout(redirectTimer);
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

