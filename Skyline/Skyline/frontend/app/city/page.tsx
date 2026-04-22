"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/';
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
