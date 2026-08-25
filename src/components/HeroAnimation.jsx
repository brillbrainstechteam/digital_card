import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
// The real card owns these icon sets. Importing them here rather than
// re-drawing lookalikes keeps the hero mockup honest: whatever a customer's
// published card renders, the marketing phone renders the same glyphs.
import { ActionIcon, SocialIcon } from '../features/digital-card/components/CardPreview';
import '../hero-animation.css';

/* ══════════════════════════════════════════════════════
   Self-hosted artwork
   These used to be third-party requests on the hero's
   critical path — Unsplash portraits, flaticon logos and
   an api.qrserver.com image. Now inline SVG that picks up
   each persona's palette: no network, no licensing
   question, no stock photo of a real person captioned
   with an invented name.
   ══════════════════════════════════════════════════════ */

function AvatarMark({ colors, className }) {
  const id = useId();
  const [c0, c1] = colors;
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="Illustrated portrait">
      <defs>
        <linearGradient id={`av-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c0} />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="48" fill={`url(#av-${id})`} />
      <circle cx="48" cy="39" r="15" fill="#fff" fillOpacity="0.93" />
      <path d="M18 88c3.5-17 14.5-25.5 30-25.5S74.5 71 78 88Z" fill="#fff" fillOpacity="0.93" />
    </svg>
  );
}

// The real Brill Brains mark, served from /public. The geometric marks that
// used to sit here were invented per-persona, and the architectural one read
// as a large upward arrow rather than a logo. bb-logo.png is white-stroked,
// which is why the card below is a single dark surface — the mark is
// invisible on white.
function BrandLogo({ className }) {
  return <img src="/bb-logo.png" alt="Brill Brains" className={className} />;
}

// A believable QR: three finder patterns plus a deterministic module field,
// seeded so it renders identically on every paint instead of shimmering.
function QrPattern({ className, style }) {
  const modules = useMemo(() => {
    const N = 21;
    let seed = 0x2f6e2b1;
    const rand = () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return ((seed >>> 0) % 1000) / 1000;
    };
    const inFinder = (x, y) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    const out = [];
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        if (!inFinder(x, y) && rand() > 0.52) out.push([x, y]);
      }
    }
    return out;
  }, []);

  const finder = (x, y) => (
    <g key={`f-${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );

  return (
    <svg viewBox="0 0 21 21" className={className} style={style} shapeRendering="crispEdges" role="img" aria-label="QR code">
      {modules.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />)}
      {finder(0, 0)}{finder(14, 0)}{finder(0, 14)}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   Personas
   Palettes are three steps of one hue — deep / mid / light
   — so the band, buttons and accents stay in the same
   family instead of the earlier flat slate-grey and
   primary-blue combinations.
   ══════════════════════════════════════════════════════ */

const SOCIALS = ['instagram', 'linkedin', 'facebook', 'twitter', 'youtube', 'telegram'];

const PRODUCT_DATA = [
  {
    id: 'personal',
    type: 'Personal',
    name: 'Julian Vance',
    title: 'Visual Designer',
    company: 'Vance Studio',
    tagline: 'Capturing moments through a digital lens.',
    location: 'Bandra West, Mumbai',
    colors: ['#1E1B4B', '#4F46E5', '#A5B4FC'], // Indigo
    hasLogo: false,
    hasAvatar: true,
  },
  {
    id: 'professional',
    type: 'Professional',
    name: 'Elena Rodriguez',
    title: 'Senior Architect',
    company: 'Stellar Studios',
    tagline: 'Modern spaces for modern living.',
    location: 'Koregaon Park, Pune',
    colors: ['#0C4A6E', '#0284C7', '#7DD3FC'], // Ocean
    hasLogo: true,
    hasAvatar: true,
  },
  {
    id: 'business',
    type: 'Business',
    name: 'Aura Wellness',
    title: 'Corporate Health',
    company: 'Aura Wellness Pvt Ltd',
    tagline: 'Elevating workspace productivity through health.',
    location: 'Indiranagar, Bengaluru',
    colors: ['#134E4A', '#0D9488', '#5EEAD4'], // Teal
    hasLogo: true,
    hasAvatar: false,
  },
];

// Per-scene dwell time. A flat 2s x 12 ran for 24 seconds, so anyone who
// scrolled past in the first few seconds saw a fragment out of context. The
// cumulative build steps each add a single element and need far less time
// than the setup and payoff beats.
const SCENE_MS = [1000, 1200, 1400, 600, 900, 850, 800, 750, 1000, 900, 1000, 1400, 1600, 1300];
const SCENE_COUNT = SCENE_MS.length;
const RESTING_SCENE = 10; // fully built card, before the publish overlay

// The finished card is taller than the phone screen, exactly as a real card
// is. Later scenes pan down it so the footer features (address, subscribe,
// branding) are actually seen rather than clipped. How far to pan
// is measured at runtime rather than hardcoded — the overflow depends on the
// persona (only two of three have an avatar), so a fixed pixel value
// over-scrolls some cards and leaves a band of blank white below the content.
const SCROLL_FRACTION_BY_SCENE = { 9: 0.55, 10: 1, 11: 1, 12: 1 };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

// Dev-only: ?heroScene=10&heroCard=1 pins a scene so the build-up can be
// inspected frame by frame. Stripped from production builds by the DEV guard.
function debugOverride(key) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get(key);
  return v === null ? null : Number(v);
}

const HeroAnimation = () => {
  const reduced = usePrefersReducedMotion();
  const pinnedScene = debugOverride('heroScene');
  const pinnedCard = debugOverride('heroCard');
  const [scene, setScene] = useState(pinnedScene ?? (reduced ? RESTING_SCENE : 1));
  const [cardIdx, setCardIdx] = useState(pinnedCard ?? 0);
  const active = PRODUCT_DATA[cardIdx] ?? PRODUCT_DATA[0];

  // A ~15s looping animation is exactly what "reduce motion" asks us not to
  // play, so settle on the finished card and stop there.
  useEffect(() => {
    if (reduced) setScene(RESTING_SCENE);
  }, [reduced]);

  useEffect(() => {
    if (reduced || pinnedScene !== null) return undefined;
    const t = setTimeout(() => {
      // `scene` is already a dependency, so read it directly rather than
      // advancing the persona from inside a setScene updater. Updaters must
      // be pure — StrictMode double-invokes them, which stepped cardIdx twice
      // per loop and skipped a persona entirely on every cycle in dev.
      if (scene >= SCENE_COUNT) {
        setCardIdx((c) => (c + 1) % PRODUCT_DATA.length);
        setScene(1);
      } else {
        setScene(scene + 1);
      }
    }, SCENE_MS[scene - 1] ?? 1000);
    return () => clearTimeout(t);
  }, [scene, reduced, pinnedScene]);

  const floatAnimation = reduced
    ? { rotateY: 0, rotateX: 0, y: 0 }
    : { rotateY: scene >= 13 ? 180 : [-4, 4, -4], rotateX: [2, -2, 2], y: [0, -15, 0] };

  return (
    // The phone mock is a fixed 248x512px box with no responsive variant
    // (Tailwind arbitrary values like w-[248px] can't respond to viewport size
    // on their own), so on mobile it stayed full-size and inflated the hero's
    // height well past the fold. framer-motion drives the inner element's own
    // `transform` inline for the 3D rotation, so a competing CSS scale() on
    // that same element would be overwritten. Instead scale a plain wrapper
    // around it — the transforms compose since they're on different elements —
    // and shrink the wrapper's own box (see hero-animation.css) so the layout
    // actually reclaims the space rather than just visually shrinking.
    <div className="hero-phone-scale-outer">
      <div className="hero-phone-scale-inner">
        <motion.div
          animate={floatAnimation}
          transition={reduced ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
          className="relative w-[248px] h-[512px] transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          <div className="absolute inset-0 bg-[#0a0a0a] rounded-[3rem] border-[8px] border-[#1a1a1a] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">

            {/* FRONT: builder → finished card */}
            <div className="absolute inset-0 backface-hidden bg-white">
              <CardScreen scene={scene} active={active} />
              {!reduced && (
                <motion.div
                  animate={{ x: [-500, 500] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                />
              )}
            </div>

            {/* BACK: analytics */}
            <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-[#F8F9FA] p-6 text-black">
              <AnalyticsScreen isVisible={scene >= 13} reduced={reduced} accent={active.colors[1]} />
            </div>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-50" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   Front screen
   Scenes 4-12 assemble the same element order the real
   CardPreview renders: logo band, photo, name, designation,
   company, tagline, quick actions, Save Contact, Website,
   socials, address, Subscribe, and the Brill Brains footer.
   ══════════════════════════════════════════════════════ */

const CardScreen = ({ scene, active }) => {
  const c = active.colors;
  const building = scene >= 4 && scene <= 12;
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const [maxScroll, setMaxScroll] = useState(0);

  // Re-measure whenever the card grows or the persona changes, so the pan
  // always stops exactly at the last line of content.
  useLayoutEffect(() => {
    const v = viewportRef.current;
    const el = contentRef.current;
    if (!v || !el) return;
    setMaxScroll(Math.max(0, el.scrollHeight - v.clientHeight));
  }, [scene, active]);

  const scrollY = maxScroll * (SCROLL_FRACTION_BY_SCENE[scene] ?? 0);

  return (
    <div className="h-full w-full overflow-hidden text-black font-sans">
      <AnimatePresence mode="wait">

        {scene === 1 && (
          <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
              <Plus className="text-gray-400" />
            </div>
            <button className="px-6 py-3 text-white rounded-xl font-bold text-sm" style={{ backgroundColor: c[0] }}>Create New Card</button>
          </motion.div>
        )}

        {scene === 2 && (
          <motion.div key="s2" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-6 pt-16">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-4">SELECT PRESET</p>
            {PRODUCT_DATA.map((p) => {
              const on = p.type === active.type;
              return (
                <div key={p.type} className="p-4 rounded-xl border-2 mb-3" style={on ? { borderColor: c[1], backgroundColor: `${c[2]}26` } : { borderColor: '#F3F4F6', opacity: 0.55 }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">{p.type}</span>
                    {on && <Check size={14} style={{ color: c[1] }} />}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {scene === 3 && (
          <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-8">AI COLOR EXTRACTION</div>
            {/* Shown on a dark tile: the mark is white-stroked and would be
                invisible against this builder screen's white background. */}
            {active.hasLogo && (
              <div className="w-14 h-14 mb-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: c[0] }}>
                <BrandLogo className="h-8 w-auto object-contain" />
              </div>
            )}
            <div className="flex gap-3">
              {c.map((col, i) => (
                <motion.div key={col} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                  className="w-10 h-10 rounded-full border border-gray-100 shadow-lg" style={{ backgroundColor: col }} />
              ))}
            </div>
            <p className="mt-6 text-xs font-mono animate-pulse" style={{ color: c[1] }}>Syncing themes...</p>
          </motion.div>
        )}

        {building && (
          <motion.div key="card" ref={viewportRef} className="h-full w-full" style={{ backgroundColor: c[0] }}>
            <motion.div
              ref={contentRef}
              animate={{ y: -scrollY }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center"
              style={{ backgroundColor: c[0] }}
            >
              {/* One continuous surface — the card used to be a dark band over
                  a white body, i.e. two backgrounds stacked. */}
              <div className="w-full pt-5 pb-1 flex items-center justify-center shrink-0">
                {active.hasLogo && scene >= 5 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <BrandLogo className="h-9 w-auto object-contain" />
                  </motion.div>
                )}
              </div>

              <div className="w-full px-4 pb-4 flex flex-col items-center">
                {active.hasAvatar && scene >= 4 && (
                  <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-2 mt-1">
                    <AvatarMark colors={c} className="w-[62px] h-[62px] rounded-full shadow-lg" />
                  </motion.div>
                )}
                {!active.hasAvatar && <div className="h-2" />}

                {/* Name / designation / company / tagline */}
                {scene >= 5 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-1">
                    <h2 className="text-[19px] font-bold text-white leading-tight">{active.name}</h2>
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/55 mt-0.5">{active.title}</p>
                    <p className="text-[11px] font-semibold text-white/85 mt-0.5">{active.company}</p>
                    <p className="text-[9px] text-white/50 mt-1.5 px-2 leading-relaxed italic">"{active.tagline}"</p>
                  </motion.div>
                )}

                {/* Call / Email / WhatsApp */}
                {scene >= 6 && (
                  <div className="grid grid-cols-3 gap-1.5 w-full mt-3">
                    {['call', 'email', 'whatsapp'].map((t, i) => (
                      <motion.div key={t} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}
                        className="py-2 rounded-lg text-white flex flex-col items-center gap-0.5 shadow-sm" style={{ backgroundColor: c[1] }}>
                        <ActionIcon type={t} />
                        <span className="text-[7.5px] font-bold capitalize">{t === 'whatsapp' ? 'WhatsApp' : t}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Save Contact — the primary action, so it inverts against
                    the dark surface instead of blending into it. */}
                {scene >= 6 && (
                  <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.24 }}
                    className="w-full mt-1.5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold shadow-sm bg-white" style={{ color: c[0] }}>
                    <ActionIcon type="save" /> Save Contact
                  </motion.div>
                )}

                {/* Website */}
                {scene >= 7 && (
                  <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="w-full mt-1.5 py-2.5 rounded-lg text-[10px] font-bold border border-white/25 text-white/90">
                    Website
                  </motion.div>
                )}

                {/* Six social links */}
                {scene >= 8 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                    {SOCIALS.map((p, i) => (
                      <motion.span key={p} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                        className="inline-flex text-white/85">
                        <SocialIcon platform={p} />
                      </motion.span>
                    ))}
                  </motion.div>
                )}

                {/* Address */}
                {scene >= 9 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[8.5px] text-white/45 mt-3">
                    {active.location}
                  </motion.p>
                )}

                {/* Subscribe + branding */}
                {scene >= 10 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mt-2.5 flex flex-col items-center gap-2">
                    <span className="text-[9px] font-bold" style={{ color: c[2] }}>Subscribe</span>
                    <span className="text-[7px] text-white/30 tracking-wide">Powered by Brill Brains Consultants</span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Publish overlay */}
            {scene >= 11 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white/96 z-50 flex flex-col items-center justify-center p-6 text-center">
                {scene === 11 ? (
                  <>
                    <div className="w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl mb-4 flex items-center justify-center p-3">
                      <QrPattern className="w-full h-full opacity-25" style={{ color: c[0] }} />
                    </div>
                    <p className="text-[11px] font-mono animate-pulse text-gray-500">GENERATING QR...</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4 shadow-xl" style={{ backgroundColor: c[1], boxShadow: `0 12px 28px ${c[1]}40` }}>
                      <Check size={30} />
                    </div>
                    <h4 className="text-lg font-bold">Successfully Published</h4>
                    <p className="text-[11px] text-gray-400 mt-1.5">Your digital identity is now live.</p>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   Back screen — analytics
   Figures are illustrative, so they are modest and badged
   "sample". The previous 24,000 views / 120 leads / 16.7%
   read as a real platform statistic on a marketing page.
   ══════════════════════════════════════════════════════ */

const SAMPLE_VIEWS = 1284;

const AnalyticsScreen = ({ isVisible, reduced, accent }) => {
  const [views, setViews] = useState(0);

  useEffect(() => {
    if (!isVisible) { setViews(0); return undefined; }
    if (reduced) { setViews(SAMPLE_VIEWS); return undefined; }
    const step = Math.ceil(SAMPLE_VIEWS / 28);
    const interval = setInterval(() => {
      setViews((prev) => (prev + step >= SAMPLE_VIEWS ? SAMPLE_VIEWS : prev + step));
    }, 45);
    return () => clearInterval(interval);
  }, [isVisible, reduced]);

  return (
    <div className="flex flex-col h-full py-6">
      <div className="flex items-center gap-2 mb-7 border-b border-gray-100 pb-4">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round">
          <path d="M3 20h18M7 20V10M12 20V4M17 20v-7" />
        </svg>
        <span className="font-bold text-gray-800 text-sm">Card Performance</span>
        <span className="ml-auto text-[7.5px] font-bold tracking-widest text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">SAMPLE</span>
      </div>

      <div className="space-y-5">
        <StatRow label="Total Views" display={views.toLocaleString('en-IN')} fill="72%" accent={accent} />
        <StatRow label="Leads Captured" display="37" fill="41%" accent={accent} />
        <StatRow label="QR Scans" display="212" fill="55%" accent={accent} />
        <StatRow label="Conversion" display="2.9%" fill="29%" accent={accent} />
      </div>

      <div className="mt-auto">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Activity</p>
          {[['New lead captured', '12m ago'], ['Card viewed', '48m ago'], ['QR scanned', '2h ago']].map(([label, when]) => (
            <div key={label} className="flex justify-between items-center mb-2.5 last:mb-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                <span className="text-[9.5px] font-medium text-gray-700">{label}</span>
              </div>
              <span className="text-[8.5px] text-gray-300">{when}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Each bar used to animate to a hardcoded 70% no matter what number sat above
// it, so "Conversion 16.7%" drew a nearly-full bar.
const StatRow = ({ label, display, fill, accent }) => (
  <div>
    <div className="flex justify-between items-end mb-1.5">
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-lg font-bold text-gray-900">{display}</span>
    </div>
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: fill }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ backgroundColor: accent }} />
    </div>
  </div>
);

export default HeroAnimation;
