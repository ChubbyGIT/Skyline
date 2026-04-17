import { createFileRoute } from "@tanstack/react-router";
import { Particles } from "@/components/site/Particles";
import { ArrowUpRight, Sparkles, Hexagon } from "lucide-react";
import { loginWithGoogle } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skyline — Your Life, Built in 3D" },
      {
        name: "description",
        content: "A spatial diary for the modern mind. Transform your memories into a living 3D cityscape.",
      },
      { property: "og:title", content: "Skyline — Your Life, Built in 3D" },
      { property: "og:description", content: "A spatial diary for the modern mind." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-surface text-foreground antialiased">
      <Navbar />
      <main>
        <Hero />
        <ProblemSolution />
        <Science />
        <Mission />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

/* ─────────────── NAVBAR ─────────────── */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function Navbar() {
  const links = [
    { label: "Platform", sectionId: "platform" },
    { label: "Science",  sectionId: "mission"  },
    { label: "Journal",  sectionId: "cta"      },
  ];
  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <img
            src="/skyline-logo.png"
            alt="Skyline"
            style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '6px', filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' }}
          />
          <span className="text-glow font-semibold tracking-tighter text-emerald-50">Skyline</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.sectionId)}
              className="text-sm font-medium text-emerald-100/60 transition-colors duration-300 hover:text-emerald-50 hover:text-glow-gold"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <a
          href="https://forms.gle/nooFRvWXHAPZArxB9"
          target="_blank"
          rel="noopener noreferrer"
          className="cta-glass inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-50"
        >
          Share Feedback
          <ArrowUpRight className="h-3.5 w-3.5 text-[#eac33e]" />
        </a>
      </div>
    </header>
  );
}

/* ─────────────── HERO ─────────────── */
function Hero() {
  return (
    <section className="hero-mesh section-glow relative isolate overflow-hidden pt-32 pb-28">
      <Particles />
      <div className="orbit-ring pointer-events-none absolute -right-40 top-24 h-[520px] w-[520px] opacity-40" />
      <div className="orbit-ring pointer-events-none absolute -left-32 bottom-0 h-[360px] w-[360px] opacity-30" style={{ animationDirection: "reverse" }} />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="chip mb-8">
            <span className="pulse-dot" />
            <span>Spatial Memory Platform</span>
          </span>

          <h1 className="headline-tight text-glow text-[3.5rem] font-semibold text-emerald-50 sm:text-[4.5rem] md:text-[5.5rem]">
            Skyline
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-emerald-100/70">
            Your Life, Built in 3D.{" "}
            <span className="text-glow-gold font-medium text-[#eac33e]">A spatial diary</span>{" "}
            for the modern mind.
          </p>

          <div className="mt-12 flex items-center gap-4">
            <button
              onClick={loginWithGoogle}
              className="cta-glass inline-flex items-center gap-3 px-7 py-3.5 text-sm font-medium text-emerald-50"
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── PROBLEM / SOLUTION ─────────────── */
function ProblemSolution() {
  return (
    <section id="platform" className="section-glow relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Problem */}
          <article
            className="card-glow relative overflow-hidden rounded-[20px] p-10"
            style={{
              background: "linear-gradient(160deg, #0d1613 0%, #080c0b 60%, #0a1a14 100%)",
              border: "1px solid rgba(16,185,129,0.08)",
              boxShadow: "var(--shadow-ambient)",
            }}
          >
            <span className="label-spaced text-[#eac33e]">The Digital Void</span>
            <h3 className="headline-tight mt-4 text-3xl font-semibold text-emerald-50 md:text-4xl">
              Instagram Fatigue &amp; Grid Zero.
            </h3>
            <p className="mt-6 max-w-md text-base leading-relaxed text-emerald-100/65">
              Modern journaling has flattened our memories. We scroll past our lives in a 2D
              vertical void, suffering from content fatigue where{" "}
              <span className="font-medium text-[#eac33e]">meaningful moments</span>{" "}
              become mere pixels.
            </p>

            {/* Abstract art — disintegrating 2D feed */}
            <div className="relative mt-10 h-48 w-full overflow-hidden rounded-xl opacity-70">
              <svg viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                  <linearGradient id="fadeOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0d1613" stopOpacity="0" />
                    <stop offset="100%" stopColor="#080c0b" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="rowGold" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#eac33e" stopOpacity="0.5" />
                    <stop offset="60%"  stopColor="#eac33e" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#eac33e" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="rowGreen" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="70%"  stopColor="#10b981" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <filter id="blur1">
                    <feGaussianBlur stdDeviation="1.2" />
                  </filter>
                </defs>

                {/* Feed rows — dissolving leftward */}
                {[0,1,2,3,4,5,6].map((i) => {
                  const y = 8 + i * 27;
                  const w = 280 - i * 28;
                  const op = 1 - i * 0.12;
                  const color = i % 3 === 1 ? "url(#rowGold)" : "url(#rowGreen)";
                  return (
                    <g key={i} opacity={op}>
                      {/* Avatar placeholder */}
                      <rect x="6" y={y + 3} width="16" height="16" rx="8"
                        fill={i % 3 === 1 ? "#eac33e" : "#10b981"} opacity="0.3" />
                      {/* Content bar */}
                      <rect x="28" y={y + 5} width={w} height="7" rx="3.5"
                        fill={color} filter="url(#blur1)" />
                      {/* Sub-bar */}
                      <rect x="28" y={y + 16} width={w * 0.55} height="4" rx="2"
                        fill={color} opacity="0.4" filter="url(#blur1)" />
                      {/* Pixel fragments scattering right */}
                      {[0,1,2].map((j) => (
                        <rect key={j}
                          x={28 + w + 6 + j * 9}
                          y={y + 4 + j * 3}
                          width={3 - j * 0.5}
                          height={3 - j * 0.5}
                          rx="1"
                          fill={i % 3 === 1 ? "#eac33e" : "#10b981"}
                          opacity={0.25 - j * 0.07}
                        />
                      ))}
                    </g>
                  );
                })}

                {/* Vertical scan line */}
                <rect x="24" y="0" width="1" height="200" fill="#10b981" opacity="0.15" />

                {/* Fade-to-void overlay */}
                <rect x="0" y="0" width="340" height="200" fill="url(#fadeOut)" />
              </svg>
            </div>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(16,185,129,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.6) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
          </article>

          {/* Solution */}
          <article className="card-glow liquid-glass relative flex flex-col overflow-hidden p-10">
            <span className="label-spaced text-[#10b981]">The Solution</span>
            <h3 className="headline-tight mt-4 text-3xl font-semibold text-emerald-50 md:text-4xl">
              Spatial Reflection
            </h3>
            <div className="relative mt-8 flex-1 overflow-hidden rounded-2xl" style={{ minHeight: "200px" }}>
              <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent z-10" />
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDi1sqI4q1OOze0lyS9tWrD8OPwfz_YC0YOtvjFtphr_i2t7Fp6fAjb94qUpHsgUL05h8df3qeLR1PGYqmqr880QZuS5YxKVWWxKDv1I-ptYH_4LCi6EP22tRXdoBjBTUBZTicaK_av98dCjA1huMasyfhG1qC4mvfMzL6OhSZdIU8nx4PcsfVCzckV2k_hWjsaJdmbmFti0tCI9_eBSG-PV5S1eUaVLp5duRNCO_oNUNJ_v950zAT_xpW-JZApVfdoCKPupeSarsA"
                alt="3D city visualization"
                className="h-full w-full object-cover opacity-60 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-700 hover:scale-105"
                style={{ filter: "hue-rotate(60deg) saturate(1.4)", minHeight: "200px" }}
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── BENTO / COLOR MAPPING ─────────────── */
function Science() {
  // Matches CATEGORY_COLORS in frontend/store/useStore.ts exactly
  const colors = [
    { bg: "#4A90E2", shadow: "rgba(74,144,226,0.6)",   label: "Career",        tc: "#93c5fd" },
    { bg: "#FF69B4", shadow: "rgba(255,105,180,0.6)",  label: "Health",        tc: "#f9a8d4" },
    { bg: "#90EE90", shadow: "rgba(144,238,144,0.5)",  label: "Relationships", tc: "#86efac" },
    { bg: "#FF6B6B", shadow: "rgba(255,107,107,0.6)",  label: "Personal",      tc: "#fca5a5" },
    { bg: "#FFD700", shadow: "rgba(255,215,0,0.6)",    label: "Other",         tc: "#fde047" },
  ];

  return (
    <section id="science" className="section-glow relative py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(at 80% 20%, rgba(16,185,129,0.08), transparent 55%), radial-gradient(at 10% 90%, rgba(234,195,62,0.05), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-stretch">

          {/* Left — entry cards */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div
              className="card-glow rounded-[16px] p-5"
              style={{
                background: "linear-gradient(160deg, #0d1613 0%, #080c0b 100%)",
                border: "1px solid rgba(16,185,129,0.12)",
                boxShadow: "var(--shadow-ambient)",
              }}
            >
              <span className="label-spaced text-[#eac33e]">Entry Category</span>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-[#10b981]"
                  style={{ boxShadow: "0 0 8px rgba(16,185,129,0.8)", animation: "pulse-emerald 2s cubic-bezier(0.4,0,0.2,1) infinite" }}
                />
                <span className="text-sm font-semibold text-[#10b981]">Career Growth</span>
              </div>
            </div>

            <div
              className="card-glow rounded-[16px] p-5"
              style={{
                background: "linear-gradient(160deg, #0d1613 0%, #080c0b 100%)",
                border: "1px solid rgba(16,185,129,0.12)",
                boxShadow: "var(--shadow-ambient)",
              }}
            >
              <span className="label-spaced text-[#10b981]">Architecture</span>
              <div className="mt-2 text-sm font-bold text-[#eac33e]">Emerald Spire</div>
            </div>

            <p className="mt-2 text-sm italic leading-relaxed text-emerald-100/55 px-1">
              &ldquo;Your city grows as you reflect. Every entry adds a floor, every core memory raises a castle.&rdquo;
            </p>
          </div>

          {/* Right — color mapping */}
          <div
            className="card-glow md:col-span-8 rounded-[20px] p-8 md:p-10"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(234,195,62,0.04))",
              border: "1px solid rgba(234,195,62,0.18)",
              boxShadow: "var(--shadow-gold-glow)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h3 className="headline-tight text-2xl font-semibold text-emerald-50 md:text-3xl mb-8">
              Atmospheric Color Mapping
            </h3>
            <div className="grid grid-cols-5 gap-4">
              {colors.map(({ bg, shadow, label, tc }) => (
                <div key={label} className="card-glow group flex flex-col items-center gap-3">
                  <div
                    className="w-full rounded-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105"
                    style={{ height: "48px", background: bg, boxShadow: `0 0 16px ${shadow}` }}
                  />
                  <span className="label-spaced text-center" style={{ fontSize: "0.6rem", color: tc }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────── SPATIAL MEMORY ─────────────── */
function Mission() {
  return (
    <section id="mission" className="section-glow relative py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(at 10% 50%, rgba(16,185,129,0.10), transparent 55%), radial-gradient(at 90% 20%, rgba(234,195,62,0.07), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">

          {/* Left */}
          <div>
            <h2 className="headline-tight text-4xl font-semibold text-emerald-50 md:text-5xl mb-8">
              The Science of{" "}
              <span className="text-glow-gold text-[#eac33e]">Spatial Memory.</span>
            </h2>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-glow text-[4.5rem] font-semibold leading-none tracking-[-0.04em] text-[#10b981]">
                32%
              </span>
              <p className="text-base leading-snug text-emerald-100/65 max-w-[200px]">
                Improvement in long-term retention over 2D interfaces.
              </p>
            </div>

            <p className="text-base leading-relaxed text-emerald-100/65 mb-10 max-w-lg">
              Our brains are biologically optimized for 3D environments. By mapping your
              journal entries to a persistent cityscape, Skyline leverages the{" "}
              <span className="font-bold text-[#eac33e]">&ldquo;Method of Loci&rdquo;</span>
              &mdash;a mnemonic system that uses spatial visualization to organize and recall
              information more effectively.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="chip" style={{ color: "#eac33e", borderColor: "rgba(234,195,62,0.35)" }}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Cognitive Load Reducer
              </span>
              <span className="chip" style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.35)" }}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visual Indexing
              </span>
            </div>
          </div>

          {/* Right — crystal image */}
          <div className="relative group">
            <div
              className="absolute -inset-4 rounded-[24px] blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000"
              style={{ background: "linear-gradient(135deg, rgba(234,195,62,0.25), rgba(16,185,129,0.20))" }}
            />
            <div
              className="card-glow relative overflow-hidden rounded-[20px]"
              style={{
                background: "#0d1613",
                border: "1px solid rgba(16,185,129,0.12)",
                boxShadow: "var(--shadow-ambient)",
              }}
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCX2Bs7I2cvvvzjCmKMpWzoHShEHhcU8rO6rYkdddELpRxpc07Mik3Wqta5Ruz6uLRogefXqOSmujSv6OK1xgkbkLhnWsjnQhI5FkcrRkBsmNtkXn8ZKBRyenutGIhg-aIt4gJIV1feI1f_w64dDTEI3q0l6M8Ksi28-MqgOIy2bqUg5X3Lh_tCr0kkXkpRbJBkOgnU2fvjc3_uDetAXzu0htdV3A_Ascn6CrhYcTa1V7H8o_bL_RkEfy7gRoXSFS46nGa2MU93E7U"
                alt="Spatial memory crystal visualization"
                className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ filter: "hue-rotate(60deg) saturate(1.2)" }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────── CTA BAND ─────────────── */
function CtaBand() {
  return (
    <section id="cta" className="section-glow relative py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(at 50% 50%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(at 80% 30%, rgba(234,195,62,0.10), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h2 className="headline-tight text-glow text-5xl font-semibold text-emerald-50 md:text-6xl">
          Your skyline is waiting
          <br />
          <span className="text-glow-gold italic text-[#eac33e]">to be built.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-emerald-100/65">
          Join 10,000+ builders mapping their existence in the{" "}
          <span className="font-medium text-[#eac33e]">emerald deep</span>.
        </p>
        <div className="mt-12">
          <button
            onClick={loginWithGoogle}
            className="cta-glass inline-flex items-center gap-3 px-9 py-4 text-sm font-medium text-emerald-50"
          >
            <Sparkles className="h-4 w-4 text-[#eac33e]" />
            Start Your Journal
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── FOOTER ─────────────── */
function Footer() {
  return (
    <footer className="relative border-t border-[#10b981]/10 py-8">
      <div className="divider-tonal absolute inset-x-0 top-0" />
      <div className="mx-auto flex max-w-7xl items-center justify-center px-6">
        <a href="#" className="flex items-center gap-2">
          <img
            src="/skyline-logo.png"
            alt="Skyline"
            style={{ height: '28px', width: '28px', objectFit: 'contain', borderRadius: '5px', filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' }}
          />
          <span className="text-glow text-sm font-semibold tracking-tighter text-emerald-50">Skyline</span>
        </a>
      </div>
    </footer>
  );
}
